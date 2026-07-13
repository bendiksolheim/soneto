import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const sqlite = new DatabaseSync(process.env.DB_PATH ?? "./soneto.db");
    sqlite.exec("PRAGMA journal_mode = WAL;");
    _db = drizzle({ client: sqlite });
    migrate(_db, { migrationsFolder: "./lib/db/migrations" });
  }
  return _db;
}
