import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

const sqlite = new Database(process.env.DB_PATH ?? "./soneto.db");
sqlite.pragma("journal_mode = WAL");
export const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: "./lib/db/migrations" });
