import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
	if (!_db) {
		const sqlite = new Database(process.env.DB_PATH ?? "./soneto.db");
		sqlite.pragma("journal_mode = WAL");
		_db = drizzle(sqlite, { schema });
		migrate(_db, { migrationsFolder: "./lib/db/migrations" });
	}
	return _db;
}
