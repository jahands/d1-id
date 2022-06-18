import { Database } from "@cloudflare/d1";
import { Env } from "./types";

let db: Database;

export function getDB(env: Env): Database {
  if (!db) {
    db = new Database(env.D1);
  }
  return db;
}
