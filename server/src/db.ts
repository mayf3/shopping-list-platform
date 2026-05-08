import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

export type Role = 'admin' | 'user';

export type AuthUser = {
  id: number;
  username: string;
  role: Role;
};

let database: Database.Database | undefined;

const categorySeeds = [
  {
    name: '食品生鲜',
    icon: '🥬',
    children: ['蔬菜水果', '肉禽蛋奶', '粮油调味', '零食饮料']
  },
  {
    name: '日用品',
    icon: '🧴',
    children: ['个人护理', '家居清洁', '纸品']
  },
  {
    name: '电子产品',
    icon: '🔌',
    children: ['数码配件', '家用电器']
  },
  { name: '服装鞋帽', icon: '👕', children: [] },
  { name: '家居用品', icon: '🏠', children: [] },
  { name: '图书文具', icon: '📚', children: [] },
  {
    name: '儿童用品',
    icon: '🧸',
    children: ['玩具', '桌游', '绘本']
  },
  {
    name: '云服务',
    icon: '☁️',
    children: ['服务器', '域名', 'SSL证书']
  },
  { name: '其他', icon: '📦', children: [] }
];

export const getDb = () => {
  if (!database) {
    fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
    database = new Database(config.databasePath);
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');
  }

  return database;
};

export const closeDb = () => {
  if (database) {
    database.close();
    database = undefined;
  }
};

export const migrate = () => {
  const db = getDb();
  const schemaPath = path.join(config.projectRoot, 'schema', 'schema.sql');
  db.exec(fs.readFileSync(schemaPath, 'utf8'));
};

export const seedDefaults = () => {
  const db = getDb();

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (name, icon, parent_id, sort_order)
    VALUES (@name, @icon, @parent_id, @sort_order)
  `);
  const getCategory = db.prepare('SELECT id FROM categories WHERE name = ?');

  const seedCategories = db.transaction(() => {
    categorySeeds.forEach((category, index) => {
      insertCategory.run({
        name: category.name,
        icon: category.icon,
        parent_id: null,
        sort_order: index + 1
      });

      const parent = getCategory.get(category.name) as { id: number } | undefined;
      category.children.forEach((child, childIndex) => {
        insertCategory.run({
          name: child,
          icon: category.icon,
          parent_id: parent?.id ?? null,
          sort_order: (index + 1) * 100 + childIndex + 1
        });
      });
    });
  });

  seedCategories();

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, password_hash, role)
    VALUES (?, ?, ?)
  `);

  insertUser.run(
    config.adminUsername,
    bcrypt.hashSync(config.adminPassword, 10),
    'admin'
  );
  insertUser.run(
    config.familyUsername,
    bcrypt.hashSync(config.familyPassword, 10),
    'user'
  );
};

export const initializeDatabase = () => {
  migrate();
  seedDefaults();
};

export const getOtherCategoryId = () => {
  const row = getDb().prepare('SELECT id FROM categories WHERE name = ?').get('其他') as
    | { id: number }
    | undefined;
  return row?.id ?? null;
};
