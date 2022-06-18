import { getDB } from "./db";
import { schema } from "./schema";
import { IttyRequest, Env } from "./types";

async function updateSchema(
  _req: IttyRequest,
  env: Env,
  _ctx: ExecutionContext
) {
  const db = getDB(env);
  const data = await db.batch([
    ...["ids", "namespaces", "users"].map((t) =>
      db.prepare(`DROP TABLE IF EXISTS ${t}`)
    ),
    ...schema.map((s) => db.prepare(s)),
  ]);
  return Response.json(data);
}

async function getAllData(_req: IttyRequest, env: Env, _ctx: ExecutionContext) {
  const db = getDB(env);
  const users = await db
    .prepare("SELECT user_id,username,created_on FROM users")
    .all();
  const namespaces = await db
    .prepare("SELECT namespace_id,user_id,name,created_on FROM namespaces")
    .all();
  const ids = await db
    .prepare("SELECT _id,user_id,namespace_id,name,created_on FROM ids")
    .all();
  const data = {
    users: users.results,
    namespaces: namespaces.results,
    ids: ids.results,
  };
  return new Response(JSON.stringify(data, null, 2));
}

async function getStats(_req: IttyRequest, env: Env, _ctx: ExecutionContext) {
  const db = getDB(env);
  const res = await db.batch(
    ["PRAGMA table_list", "PRAGMA table_info", "PRAGMA data_version"].map((s) =>
      db.prepare(s)
    )
  );
  return new Response(JSON.stringify(res, null, 2));
}

export default {
  updateSchema,
  getAllData,
  getStats,
};
