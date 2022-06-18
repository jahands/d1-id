import { getDB } from "./db";
import { getNamespaceID } from "./namespaces";
import { IttyRequest, Env } from "./types";
import users from "./users";
import { missingParams, notExists, hasResults, now } from "./util";

export type ID = {
  id_id: number;
  id: string;
  created_on: number;
  user_id: number;
  namespace_id: number;
};

function makeID(length: number) {
  var result = "";
  var characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function getIDs(req: IttyRequest, env: Env, _ctx: ExecutionContext) {
  if (!req.params) {
    return missingParams();
  }
  const db = getDB(env);
  // get the user
  const userID = await users.getUserID(db, req.params.user);
  if (!userID) {
    return notExists("user");
  }

  // get the namespace
  const namespaceID = await getNamespaceID(db, userID, req.params.namespace);
  if (!namespaceID) {
    return notExists("namespace");
  }

  const ids = await db
    .prepare(
      "SELECT id,created_on FROM ids WHERE user_id = ? AND namespace_id = ?"
    )
    .bind(userID, namespaceID)
    .all();
  if (!hasResults<ID>(ids)) {
    return Response.json([]);
  }
  return Response.json(
    ids.results.map((r: any) => {
      return { id: r.id, created_on: new Date(r.created_on).toISOString() };
    })
  );
}

async function createID(req: IttyRequest, env: Env, _ctx: ExecutionContext) {
  if (!req.params) {
    return missingParams();
  }
  const db = getDB(env);

  // Make sure the user exists
  const userID = await users.getUserID(db, req.params.user);
  if (!userID) {
    return notExists("user");
  }

  // make sure the namespace exists
  const namespaceID = await getNamespaceID(db, userID, req.params.namespace);
  if (!namespaceID) {
    return notExists("namespace");
  }

  // Try up to 10 times to generate an ID
  let idLen = 5;
  let id = makeID(idLen);
  for (let i = 0; i < 10; i++) {
    const ids = await db
      .prepare("SELECT * FROM ids WHERE namespace_id = ? AND id = ?")
      .bind(namespaceID, id)
      .all();
    if (!hasResults<ID>(ids)) {
      console.log("trying 2");
      await db
        .prepare(
          "INSERT INTO ids (user_id,namespace_id,id,created_on) VALUES (?,?,?,?)"
        )
        .bind(userID, namespaceID, id, now())
        .run();
      return Response.json({ id: id, tries: i + 1 });
    } else {
      id = makeID(idLen);
    }
  }
}

async function deleteID(_req: IttyRequest, _env: Env, _ctx: ExecutionContext) {
    return new Response(`not implemented`, { status: 501 });
}

export default {
    getIDs,
    createID,
    deleteID
};
