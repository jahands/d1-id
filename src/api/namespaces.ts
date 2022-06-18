import { Database } from "@cloudflare/d1";
import { getDB } from "./db";
import { IttyRequest, Env } from "./types";
import users from "./users";
import {
  alreadyExists,
  hasResults,
  missingParams,
  notExists,
  now,
} from "./util";

export type Namespace = {
  namespace_id: number;
  name: string;
  created_on: number;
  user_id: number;
};

export async function getNamespaceID(
  db: Database,
  userID: number,
  name: string
): Promise<number | null> {
  const namespaces = await db
    .prepare(
      "SELECT namespace_id FROM namespaces WHERE user_id = ? AND name = ?"
    )
    .bind(userID, name)
    .all();
  if (hasResults<Namespace>(namespaces)) {
    return namespaces.results[0].namespace_id;
  }
  return null;
}

async function getNamespaces(
  req: IttyRequest,
  env: Env,
  _ctx: ExecutionContext
) {
  if (!req.params) {
    return missingParams();
  }
  const db = getDB(env);
  // get the user
  const userID = await users.getUserID(db, req.params.user);
  if (!userID) {
    return notExists("user");
  }

  const namespaces = await db
    .prepare("SELECT * FROM namespaces WHERE user_id = ?")
    .bind(userID)
    .all();
  return Response.json(namespaces.results || []);
}

async function createNamespace(
  req: IttyRequest,
  env: Env,
  _ctx: ExecutionContext
) {
  if (!req.params) {
    return missingParams();
  }
  const db = getDB(env);

  // get the user
  const userID = await users.getUserID(db, req.params.user);
  if (!userID) {
    return notExists("user");
  }

  // Check if the namespace already exists
  const namespaceID = await getNamespaceID(db, userID, req.params.namespace);
  if (namespaceID) {
    return alreadyExists("namespace");
  }
  const res = await db
    .prepare("INSERT INTO namespaces (user_id,name,created_on) VALUES (?,?,?)")
    .bind(userID, req.params.namespace, now())
    .run();
  return Response.json(res);
}

async function deleteNamespace(
  req: IttyRequest,
  env: Env,
  _ctx: ExecutionContext
) {
  if (!req.params) {
    return missingParams();
  }
  const db = getDB(env);
  // get the user
  const userID = await users.getUserID(db, req.params.user);
  if (!userID) {
    return notExists("user");
  }
  // Check if the namespace exists
  const namespaceID = await getNamespaceID(db, userID, req.params.namespace);
  if (!namespaceID) {
    return notExists("namespace");
  }
  // Delete the namespace
  const res = await db
    .prepare("DELETE FROM namespaces WHERE user_id = ? AND name = ?")
    .bind(userID, req.params.namespace)
    .run();
  return Response.json(res);
}

export default {
  getNamespaces,
  createNamespace,
  deleteNamespace,
};
