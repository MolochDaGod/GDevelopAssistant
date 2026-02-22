import "./env";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getPool(): Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

function getDb(): ReturnType<typeof drizzle> {
  if (!_db) {
    _db = drizzle({ client: getPool(), schema });
  }
  return _db;
}

/** Whether a database connection is configured */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

// Lazy proxies — only connect when first accessed
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return Reflect.get(getPool(), prop);
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
