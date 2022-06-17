import { Database } from "@cloudflare/d1";
import {
  Router,
  Route,
  Request as IttyRequest,
  IHTTPMethods,
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
}

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
let db: Database;

function getDB(env: Env): Database {
  if (!db) {
    db = new Database(env.D1);
  }
  return db;
}
const now = () => new Date().getTime();
function missingParams() {
  return new Response(`missing params`, { status: 400 });
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

// Update schema
router.post("/schema", async (req, env: Env, ctx: ExecutionContext) => {
  const db = getDB(env);
  const data = await db.batch([
    ...["users", "namespaces", "ids"].map((t) =>
      db.prepare(`DROP TABLE IF EXISTS ${t}`)
    ),
    ...schema.map((s) => db.prepare(s)),
  ]);
  return new Response(JSON.stringify(data));
});
router.get("/test", async (req, env: Env, ctx: ExecutionContext) => {
  const db = getDB(env);
  const data = await db.prepare("SELECT * FROM namespaces").all();
  return new Response(JSON.stringify(data));
});

/// USERS ///
// List users
router.get("/users", async (req, env: Env, ctx: ExecutionContext) => {
  const db = getDB(env);
  const { results } = await db.prepare("SELECT * FROM users").all();
  return new Response(JSON.stringify(results));
});

// Create user
router.post("/:user", async (req, env: Env, ctx: ExecutionContext) => {
  if (!req.params) {
    return missingParams();
  }
  const db = getDB(env);
  // Check if the user already exists
  const { results } = await db
    .prepare("SELECT * FROM users WHERE username = ?")
    .bind(req.params.user)
    .all();
  if (results && results.length > 0) {
    return new Response(`User ${req.params.user} already exists`, {
      status: 400,
    });
  }
  const data = await db
    .prepare("INSERT INTO users (username,created_on) VALUES (?,?)")
    .bind(req.params.user, now())
    .run();
  return new Response(JSON.stringify(data));
});

// Delete user
router.delete("/:user", async (req, env: Env, ctx: ExecutionContext) => {
  if (!req.params) {
    return missingParams();
  }
  const db = getDB(env);
  const data = await db
    .prepare("DELETE FROM users WHERE username = ?")
    .bind(req.params.user)
    .run();
  return new Response(JSON.stringify(data));
});

/// Namespaces ///
// List namespaces
router.get("/:user", async (req, env: Env, ctx: ExecutionContext) => {
  if (!req.params) {
    return missingParams();
  }
  const db = getDB(env);
  const { results } = await db
    .prepare("SELECT * FROM namespaces WHERE username = ?")
    .bind(req.params.user)
    .all();
  return new Response(JSON.stringify(results));
});

// Create namespace
router.post(
  "/:user/:namespace",
  async (req, env: Env, ctx: ExecutionContext) => {
    if (!req.params) {
      return missingParams();
    }
    const db = getDB(env);

    // Make sure the user exists
    const { results: userResults } = await db
      .prepare("SELECT * FROM users WHERE username = ?")
      .bind(req.params.user)
      .all();
    if (!userResults || userResults.length === 0) {
      return new Response(`User ${req.params.user} does not exist`);
    }

    // Check if the namespace already exists
    const { results } = await db
      .prepare("SELECT * FROM namespaces WHERE username = ? AND name = ?")
      .bind(req.params.user, req.params.namespace)
      .all();
    if (results && results.length > 0) {
      return new Response(`Namespace ${req.params.namespace} already exists`, {
        status: 400,
      });
    }
    const data = await db
      .prepare(
        "INSERT INTO namespaces (username,name,created_on) VALUES (?,?,?)"
      )
      .bind(req.params.user, req.params.namespace, now())
      .run();
    return new Response(JSON.stringify(data));
  }
);

// Delete namespace
router.delete(
  "/:user/:namespace",
  async (req, env: Env, ctx: ExecutionContext) => {
    if (!req.params) {
      return missingParams();
    }
    const db = getDB(env);
    const data = await db
      .prepare("DELETE FROM namespaces WHERE username = ? AND name = ?")
      .bind(req.params.user, req.params.namespace)
      .run();
    return new Response(JSON.stringify(data));
  }
);

/// IDs ///
// List IDs
router.get(
  "/:user/:namespace",
  async (req, env: Env, ctx: ExecutionContext) => {
    if (!req.params) {
      return missingParams();
    }
    const db = getDB(env);
    const { results } = await db
      .prepare(
        "SELECT id,created_on FROM ids WHERE username = ? AND namespace = ?"
      )
      .bind(req.params.user, req.params.namespace)
      .all();
    return new Response(
      JSON.stringify(
        results?.map((r: any) => {
          return { id: r.id, created_on: new Date(r.created_on).toISOString() };
        })
      )
    );
  }
);

// Create ID
router.get(
  "/:user/:namespace/new",
  async (req, env: Env, ctx: ExecutionContext) => {
    if (!req.params) {
      return missingParams();
    }
    const db = getDB(env);

    // Make sure the user exists
    const { results: userResults } = await db
      .prepare("SELECT * FROM users WHERE username = ?")
      .bind(req.params.user)
      .all();
    if (!userResults || userResults.length === 0) {
      return new Response(`User ${req.params.user} does not exist`);
    }

    // make sure the namespace exists
    const { results: nsResult } = await db
      .prepare("SELECT * FROM namespaces WHERE username = ? AND name = ?")
      .bind(req.params.user, req.params.namespace)
      .all();
    if (!nsResult || nsResult.length === 0) {
      return new Response(
        `Namespace ${req.params.namespace} does not exist for user ${req.params.user}`
      );
    }

    // Try up to 10 times to generate an ID
    let idLen = 5;
    let id = makeID(idLen);
    for (let i = 0; i < 10; i++) {
      const { results } = await db
        .prepare("SELECT * FROM ids WHERE namespace = ? AND id = ?")
        .bind(req.params.namespace, id)
        .all();
      if (results && results.length == 0) {
        const data = await db
          .prepare(
            "INSERT INTO ids (username,namespace,id,created_on) VALUES (?,?,?,?)"
          )
          .bind(req.params.user, req.params.namespace, id, now())
          .run();
        return new Response(JSON.stringify({ id: id }));
      } else {
        id = makeID(idLen);
      }
    }
  }
);

// Delete ID
router.delete(
  "/:user/:namespace/:id",
  async (req, env: Env, ctx: ExecutionContext) => {
    return new Response(`not implemented`, { status: 501 });
  }
);

// Run api
export default {
  fetch: router.handle,
};
