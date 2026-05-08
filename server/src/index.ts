import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import bcrypt from 'bcryptjs';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import type { Context, MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from './config.js';
import { AuthUser, getDb, getOtherCategoryId, initializeDatabase } from './db.js';

type Variables = {
  user: AuthUser;
};

type AppEnv = {
  Variables: Variables;
};

type ItemStatus = 'pending' | 'purchased' | 'cancelled';

export const app = new Hono<AppEnv>();

const itemSelect = `
  SELECT
    items.*,
    categories.name AS category_name,
    categories.icon AS category_icon,
    parent_categories.name AS parent_category_name,
    parent_categories.icon AS parent_category_icon
  FROM items
  LEFT JOIN categories ON categories.id = items.category_id
  LEFT JOIN categories AS parent_categories ON parent_categories.id = categories.parent_id
`;

const nullableString = z
  .preprocess((value) => (value === '' || value === undefined ? null : value), z.string().trim().max(500).nullable())
  .optional();

const nullableUrl = z
  .preprocess((value) => (value === '' || value === undefined ? null : value), z.string().trim().url().nullable())
  .optional();

const nullableMoney = z
  .preprocess((value) => {
    if (value === '' || value === undefined || value === null) return null;
    return Number(value);
  }, z.number().min(0).nullable())
  .optional();

const itemSchema = z.object({
  name: z.string().trim().min(1, '请输入物品名称').max(120),
  quantity: z.coerce.number().positive().default(1),
  unit: z.string().trim().min(1).max(20).default('个'),
  category_id: z.coerce.number().int().positive().nullable().optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  estimated_price: nullableMoney,
  actual_price: nullableMoney,
  store: nullableString,
  note: nullableString,
  url: nullableUrl
});

const categorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  icon: z.string().trim().min(1).max(8).default('📦'),
  parent_id: z.coerce.number().int().positive().nullable().optional(),
  sort_order: z.coerce.number().int().min(0).default(999)
});

const purchaseSchema = z.object({
  actual_price: nullableMoney,
  store: nullableString
});

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
});

const parseJson = async <T extends z.ZodTypeAny>(schema: T, c: Context<AppEnv>) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false as const,
      response: c.json(
        {
          error: '请求参数无效',
          details: z.treeifyError(parsed.error)
        },
        400
      )
    };
  }

  return { ok: true as const, data: parsed.data as z.infer<T> };
};

const createToken = (user: AuthUser) =>
  jwt.sign(
    {
      sub: String(user.id),
      username: user.username,
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

const authenticate: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.path === '/api/auth/login' || c.req.path === '/api/health') {
    await next();
    return;
  }

  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    return c.json({ error: '请先登录' }, 401);
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    c.set('user', {
      id: Number(payload.sub),
      username: String(payload.username),
      role: payload.role === 'admin' ? 'admin' : 'user'
    });
    await next();
  } catch {
    return c.json({ error: '登录已过期，请重新登录' }, 401);
  }
};

const toItem = (row: Record<string, unknown>) => {
  const categoryName = row.category_name ?? '其他';
  const parentName = row.parent_category_name ?? categoryName;

  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    category_id: row.category_id,
    category_name: categoryName,
    category_icon: row.category_icon ?? '📦',
    group_name: parentName,
    group_icon: row.parent_category_icon ?? row.category_icon ?? '📦',
    priority: row.priority,
    status: row.status,
    estimated_price: row.estimated_price,
    actual_price: row.actual_price,
    store: row.store,
    note: row.note,
    url: row.url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    purchased_at: row.purchased_at
  };
};

initializeDatabase();

app.use('*', compress());

app.use(
  '*',
  cors({
    origin: config.corsOrigin === '*' ? '*' : config.corsOrigin.split(',').map((origin) => origin.trim()),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

app.use('/api/*', authenticate);

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    service: 'shopping-list-platform',
    database: config.databasePath
  })
);

app.post('/api/auth/login', async (c) => {
  const parsed = await parseJson(loginSchema, c);
  if (!parsed.ok) return parsed.response;

  const user = getDb()
    .prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?')
    .get(parsed.data.username) as
    | { id: number; username: string; password_hash: string; role: AuthUser['role'] }
    | undefined;

  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
    return c.json({ error: '用户名或密码错误' }, 401);
  }

  const authUser = { id: user.id, username: user.username, role: user.role };
  return c.json({ token: createToken(authUser), user: authUser });
});

app.get('/api/me', (c) => c.json({ user: c.get('user') }));

app.get('/api/categories', (c) => {
  const rows = getDb()
    .prepare(
      `
        SELECT child.*, parent.name AS parent_name
        FROM categories AS child
        LEFT JOIN categories AS parent ON parent.id = child.parent_id
        ORDER BY COALESCE(parent.sort_order, child.sort_order), child.parent_id IS NOT NULL, child.sort_order, child.name
      `
    )
    .all();

  return c.json({ categories: rows });
});

app.post('/api/categories', async (c) => {
  const parsed = await parseJson(categorySchema, c);
  if (!parsed.ok) return parsed.response;

  try {
    const result = getDb()
      .prepare('INSERT INTO categories (name, icon, parent_id, sort_order) VALUES (?, ?, ?, ?)')
      .run(parsed.data.name, parsed.data.icon, parsed.data.parent_id ?? null, parsed.data.sort_order);

    const category = getDb().prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    return c.json({ category }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : '分类创建失败' }, 400);
  }
});

app.put('/api/categories/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const parsed = await parseJson(categorySchema, c);
  if (!parsed.ok) return parsed.response;

  const result = getDb()
    .prepare('UPDATE categories SET name = ?, icon = ?, parent_id = ?, sort_order = ? WHERE id = ?')
    .run(parsed.data.name, parsed.data.icon, parsed.data.parent_id ?? null, parsed.data.sort_order, id);

  if (result.changes === 0) return c.json({ error: '分类不存在' }, 404);
  const category = getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id);
  return c.json({ category });
});

app.delete('/api/categories/:id', (c) => {
  const id = Number(c.req.param('id'));
  const used = getDb().prepare('SELECT COUNT(*) AS count FROM items WHERE category_id = ?').get(id) as {
    count: number;
  };
  if (used.count > 0) return c.json({ error: '该分类下已有物品，不能删除' }, 409);
  const childCount = getDb().prepare('SELECT COUNT(*) AS count FROM categories WHERE parent_id = ?').get(id) as {
    count: number;
  };
  if (childCount.count > 0) return c.json({ error: '该分类下还有子分类，不能删除' }, 409);

  const result = getDb().prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (result.changes === 0) return c.json({ error: '分类不存在' }, 404);
  return c.json({ ok: true });
});

app.get('/api/items', (c) => {
  const status = c.req.query('status') as ItemStatus | 'all' | undefined;
  const validStatus = status && ['pending', 'purchased', 'cancelled'].includes(status) ? status : undefined;

  const rows =
    status === 'all'
      ? getDb().prepare(`${itemSelect} ORDER BY items.status, items.created_at DESC`).all()
      : getDb()
          .prepare(
            `${itemSelect} WHERE items.status = ? ORDER BY
              CASE items.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
              items.created_at DESC`
          )
          .all(validStatus ?? 'pending');

  return c.json({ items: rows.map((row) => toItem(row as Record<string, unknown>)) });
});

app.post('/api/items', async (c) => {
  const parsed = await parseJson(itemSchema, c);
  if (!parsed.ok) return parsed.response;

  const categoryId = parsed.data.category_id ?? getOtherCategoryId();
  const result = getDb()
    .prepare(
      `
        INSERT INTO items (
          name, quantity, unit, category_id, priority, estimated_price,
          actual_price, store, note, url, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      parsed.data.name,
      parsed.data.quantity,
      parsed.data.unit,
      categoryId,
      parsed.data.priority,
      parsed.data.estimated_price ?? null,
      parsed.data.actual_price ?? null,
      parsed.data.store ?? null,
      parsed.data.note ?? null,
      parsed.data.url ?? null,
      c.get('user').id
    );

  const row = getDb().prepare(`${itemSelect} WHERE items.id = ?`).get(result.lastInsertRowid) as Record<
    string,
    unknown
  >;
  return c.json({ item: toItem(row) }, 201);
});

app.put('/api/items/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const parsed = await parseJson(itemSchema, c);
  if (!parsed.ok) return parsed.response;

  const result = getDb()
    .prepare(
      `
        UPDATE items SET
          name = ?,
          quantity = ?,
          unit = ?,
          category_id = ?,
          priority = ?,
          estimated_price = ?,
          actual_price = ?,
          store = ?,
          note = ?,
          url = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `
    )
    .run(
      parsed.data.name,
      parsed.data.quantity,
      parsed.data.unit,
      parsed.data.category_id ?? getOtherCategoryId(),
      parsed.data.priority,
      parsed.data.estimated_price ?? null,
      parsed.data.actual_price ?? null,
      parsed.data.store ?? null,
      parsed.data.note ?? null,
      parsed.data.url ?? null,
      id
    );

  if (result.changes === 0) return c.json({ error: '物品不存在' }, 404);
  const row = getDb().prepare(`${itemSelect} WHERE items.id = ?`).get(id) as Record<string, unknown>;
  return c.json({ item: toItem(row) });
});

app.delete('/api/items/:id', (c) => {
  const id = Number(c.req.param('id'));
  const result = getDb().prepare('DELETE FROM items WHERE id = ?').run(id);
  if (result.changes === 0) return c.json({ error: '物品不存在' }, 404);
  return c.json({ ok: true });
});

app.patch('/api/items/:id/purchase', async (c) => {
  const id = Number(c.req.param('id'));
  const parsed = await parseJson(purchaseSchema, c);
  if (!parsed.ok) return parsed.response;

  const item = getDb().prepare('SELECT * FROM items WHERE id = ?').get(id) as
    | {
        id: number;
        name: string;
        status: ItemStatus;
        category_id: number | null;
        estimated_price: number | null;
        store: string | null;
      }
    | undefined;
  if (!item) return c.json({ error: '物品不存在' }, 404);
  if (item.status === 'purchased') {
    const row = getDb().prepare(`${itemSelect} WHERE items.id = ?`).get(id) as Record<string, unknown>;
    return c.json({ item: toItem(row) });
  }

  const price = parsed.data.actual_price ?? item.estimated_price ?? 0;
  const store = parsed.data.store ?? item.store ?? null;

  const db = getDb();
  const purchase = db.transaction(() => {
    db.prepare(
      `
        UPDATE items SET
          status = 'purchased',
          actual_price = ?,
          store = ?,
          purchased_at = datetime('now'),
          updated_at = datetime('now')
        WHERE id = ?
      `
    ).run(price, store, id);

    db.prepare(
      `
        INSERT INTO purchase_history (item_id, item_name, category_id, price, store)
        VALUES (?, ?, ?, ?, ?)
      `
    ).run(id, item.name, item.category_id, price, store);
  });

  purchase();

  const row = db.prepare(`${itemSelect} WHERE items.id = ?`).get(id) as Record<string, unknown>;
  return c.json({ item: toItem(row) });
});

app.get('/api/history', (c) => {
  const rows = getDb()
    .prepare(
      `
        SELECT purchase_history.*, categories.name AS category_name, categories.icon AS category_icon
        FROM purchase_history
        LEFT JOIN categories ON categories.id = purchase_history.category_id
        ORDER BY purchase_history.purchased_at DESC
        LIMIT 100
      `
    )
    .all();

  return c.json({ history: rows });
});

app.get('/api/stats/summary', (c) => {
  const month = new Date().toISOString().slice(0, 7);
  const db = getDb();
  const pending = db.prepare("SELECT COUNT(*) AS count, COALESCE(SUM(estimated_price), 0) AS total FROM items WHERE status = 'pending'").get() as {
    count: number;
    total: number;
  };
  const spent = db
    .prepare(
      "SELECT COALESCE(SUM(actual_price), 0) AS total, COUNT(*) AS count FROM items WHERE status = 'purchased' AND substr(purchased_at, 1, 7) = ?"
    )
    .get(month) as { total: number; count: number };
  const recent = db
    .prepare(`${itemSelect} WHERE items.status = 'purchased' ORDER BY items.purchased_at DESC LIMIT 3`)
    .all()
    .map((row) => toItem(row as Record<string, unknown>));

  return c.json({
    month,
    monthly_budget: config.defaultMonthlyBudget,
    spent_this_month: Number(spent.total ?? 0),
    remaining_budget: Math.max(config.defaultMonthlyBudget - Number(spent.total ?? 0), 0),
    pending_count: Number(pending.count ?? 0),
    pending_estimated_total: Number(pending.total ?? 0),
    purchased_this_month_count: Number(spent.count ?? 0),
    recent_purchased: recent
  });
});

if (fs.existsSync(config.staticRoot)) {
  app.use('/assets/*', serveStatic({ root: config.staticRoot }));
  app.get('*', async (c) => {
    if (c.req.path.startsWith('/api/')) return c.json({ error: '接口不存在' }, 404);
    const indexPath = path.join(config.staticRoot, 'index.html');
    return c.html(await fs.promises.readFile(indexPath, 'utf8'));
  });
} else {
  app.get('/', (c) => c.json({ ok: true, message: 'Shopping List API is running' }));
}

const startServer = () => {
  serve(
    {
      fetch: app.fetch,
      port: config.port
    },
    (info) => {
      console.log(`Shopping List API listening on http://localhost:${info.port}`);
      console.log(`SQLite database: ${config.databasePath}`);
    }
  );
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  startServer();
}
