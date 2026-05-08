import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const cwd = process.cwd();
const projectRoot = path.basename(cwd) === 'server' ? path.resolve(cwd, '..') : cwd;

for (const envPath of [path.join(projectRoot, '.env'), path.join(cwd, '.env')]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const resolveFromRoot = (value: string) => {
  if (path.isAbsolute(value)) return value;
  return path.resolve(projectRoot, value);
};

export const config = {
  projectRoot,
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  databasePath: resolveFromRoot(process.env.DATABASE_PATH ?? './data/shopping-list.db'),
  defaultMonthlyBudget: Number(process.env.DEFAULT_MONTHLY_BUDGET ?? 3000),
  adminUsername: process.env.ADMIN_USERNAME ?? 'admin',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin123',
  familyUsername: process.env.FAMILY_USERNAME ?? 'family',
  familyPassword: process.env.FAMILY_PASSWORD ?? 'family123',
  staticRoot: path.join(projectRoot, 'web', 'dist')
};

