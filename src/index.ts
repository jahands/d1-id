import { Database } from "@cloudflare/d1";
import {
  IHTTPMethods,
  Request as IttyRequest,
  Route,
  Router,
} from "itty-router";
import { schema } from "./schema";

const actions = [
  "create",
  "insert",
  "query-first",
  "query-all",
  "query-raw",
  "query-exec",
  "batch",
  "dump.sqlite",
  "exception",
  "pragmas",
];

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  D1: any;
  API_KEYS: string;
}

const KEYS = (env: Env) =>
  JSON.parse(env.API_KEYS) as { keys: Record<string, string> };

type MethodType =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS";

interface IRequest extends IttyRequest {
  method: MethodType; // method is required to be on the interface
  url: string; // url is required to be on the interface
  optional?: string;
}

interface IMethods extends IHTTPMethods {
  get: Route;
  post: Route;
  put: Route;
  delete: Route;
  patch: Route;
  head: Route;
  options: Route;
}
const router = Router<IRequest, IMethods>();

type Handler = (
  req: IttyRequest,
  env: Env,
  ctx: ExecutionContext
) => Promise<Response>;

type User = {
  user_id: number;
  username: string;
  created_on: number;
};
type Namespace = {
  namespace_id: number;
  name: string;
  created_on: number;
  user_id: number;
};
type ID = {
  id_id: number;
  id: string;
  created_on: number;
  user_id: number;
  namespace_id: number;
};
type Results<Type> = {
  results: Type[];
};
function hasResults<Type>(data: any): data is Results<Type> {
  return data.results !== undefined && data.results.length > 0;
}

let db: Database;

function getDB(env: Env): Database {
  if (!db) {
    db = new Database(env.D1);
  }
  return db;
}
const now = () => new Date().getTime();
function missingParams() {
  return Response.json(
    { error: `missing params` },
    {
      status: 400,
    }
  );
}
function alreadyExists(name: string) {
  return Response.json(
    { error: `${name} already exists` },
    {
      status: 400,
    }
  );
}
function notExists(name: string) {
  return Response.json(
    { error: `${name} does not exists` },
    {
      status: 400,
    }
  );
}

function makeID(length: number) {
  var result = "";
  var characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function getUserID(
  db: Database,
  username: string
): Promise<number | null> {
  const users = await db
    .prepare("SELECT user_id FROM users WHERE username = ?")
    .bind(username)
    .all();
  if (hasResults<User>(users)) {
    return users.results[0].user_id;
  }
  return null;
}
async function getNamespaceID(
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

function authUser(
  req: IttyRequest,
  env: Env,
  _ctx: ExecutionContext
): Response | undefined {
  const isAuthed = () => {
    const keys = KEYS(env).keys;
    // Make sure required request data is present
    if (!req.query || !req.params || !req.params.user) return false;

    // Get the API key
    const reqKey = req.query["key"];
    if (!reqKey) return false;

    // Make sure the API key is valid
    const user = req.params.user;
    const userKey = keys[user];
    if (!userKey) return false;
    return reqKey === userKey;
  };

  if (!isAuthed()) {
    return Response.json(
      { error: `forbidden` },
      {
        status: 403,
      }
    );
  }
}

function authAdmin(
  req: IttyRequest,
  env: Env,
  _ctx: ExecutionContext
): Response | undefined {
  const isAuthed = () => {
    const keys = KEYS(env).keys;
    // Make sure required request data is present
    if (!req.query) return false;

    // Get the API key
    const reqKey = req.query["key"];
    if (!reqKey) return false;

    // Make sure the API key is valid
    const user = "jacob"; // hardcoded admin user
    const userKey = keys[user];
    if (!userKey) return false;
    return reqKey === userKey;
  };

  if (!isAuthed()) {
    return Response.json(
      { error: `forbidden` },
      {
        status: 403,
      }
    );
  }
}

// Update schema
router.post(
  "/schema",
  authAdmin,
  async (_req, env: Env, _ctx: ExecutionContext) => {
    const db = getDB(env);
    const data = await db.batch([
      ...["users", "namespaces", "ids"].map((t) =>
        db.prepare(`DROP TABLE IF EXISTS ${t}`)
      ),
      ...schema.map((s) => db.prepare(s)),
    ]);
    return Response.json(data);
  }
);
router.get(
  "/test",
  authAdmin,
  async (_req, env: Env, _ctx: ExecutionContext) => {
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
);

/// USERS ///
// List users
router.get(
  "/users",
  authAdmin,
  async (_req, env: Env, _ctx: ExecutionContext) => {
    const db = getDB(env);
    const { results } = await db.prepare("SELECT * FROM users").all();
    return Response.json(results || []);
  }
);

// Create user
router.post(
  "/:user",
  authAdmin,
  async (req, env: Env, _ctx: ExecutionContext) => {
    if (!req.params) {
      return missingParams();
    }
    const db = getDB(env);
    // Check if the user already exists
    const userID = await getUserID(db, req.params.user);
    if (userID) {
      return alreadyExists("user");
    }

    const res = await db
      .prepare("INSERT INTO users (username,created_on) VALUES (?,?)")
      .bind(req.params.user, now())
      .run();
    return Response.json(res);
  }
);

// Delete user
router.delete(
  "/:user",
  authAdmin,
  async (req, env: Env, _ctx: ExecutionContext) => {
    if (!req.params) {
      return missingParams();
    }
    const db = getDB(env);
    const userID = await getUserID(db, req.params.user);
    if (!userID) {
      return notExists("user");
    }
    const data = await db
      .prepare("DELETE FROM users WHERE username = ?")
      .bind(req.params.user)
      .run();
    return Response.json(data);
  }
);

/// Namespaces ///
// List namespaces
router.get(
  "/:user",
  authUser,
  async (req, env: Env, _ctx: ExecutionContext) => {
    if (!req.params) {
      return missingParams();
    }
    const db = getDB(env);
    // get the user
    const userID = await getUserID(db, req.params.user);
    if (!userID) {
      return notExists("user");
    }

    const namespaces = await db
      .prepare("SELECT * FROM namespaces WHERE user_id = ?")
      .bind(userID)
      .all();
    return Response.json(namespaces.results || []);
  }
);

// Create namespace
router.post(
  "/:user/:namespace",
  authUser,
  async (req, env: Env, _ctx: ExecutionContext) => {
    if (!req.params) {
      return missingParams();
    }
    const db = getDB(env);

    // get the user
    const userID = await getUserID(db, req.params.user);
    if (!userID) {
      return notExists("user");
    }

    // Check if the namespace already exists
    const namespaceID = await getNamespaceID(db, userID, req.params.namespace);
    if (namespaceID) {
      return alreadyExists("namespace");
    }
    const res = await db
      .prepare(
        "INSERT INTO namespaces (user_id,name,created_on) VALUES (?,?,?)"
      )
      .bind(userID, req.params.namespace, now())
      .run();
    return Response.json(res);
  }
);

// Delete namespace
router.delete(
  "/:user/:namespace",
  authUser,
  async (req, env: Env, _ctx: ExecutionContext) => {
    if (!req.params) {
      return missingParams();
    }
    const db = getDB(env);
    // get the user
    const userID = await getUserID(db, req.params.user);
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
);

/// IDs ///
// List IDs
router.get(
  "/:user/:namespace",
  authUser,
  async (req, env: Env, _ctx: ExecutionContext) => {
    if (!req.params) {
      return missingParams();
    }
    const db = getDB(env);
    // get the user
    const userID = await getUserID(db, req.params.user);
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
);

// Create ID
router.get(
  "/:user/:namespace/new",
  authUser,
  async (req, env: Env, _ctx: ExecutionContext) => {
    if (!req.params) {
      return missingParams();
    }
    const db = getDB(env);

    // Make sure the user exists
    const userID = await getUserID(db, req.params.user);
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
);

// Delete ID
router.delete(
  "/:user/:namespace/:id",
  authUser,
  async (_req, _env: Env, _ctx: ExecutionContext) => {
    return new Response(`not implemented`, { status: 501 });
  }
);

// Run api
export default {
  fetch: router.handle,
};
