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
    ...["users", "namespaces", "ids"].map((t) =>
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
    .prepare("SELECT id_id,user_id,namespace_id,id,created_on FROM ids")
    .all();
  const data = {
    users: users.results,
    namespaces: namespaces.results,
    ids: ids.results,
  };
  return new Response(JSON.stringify(data, null, 2));
}

export default {
    updateSchema,
    getAllData
};
