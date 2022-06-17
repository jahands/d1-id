/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
}

import { Router } from "worktop";
import { listen } from "worktop/cache";

const API = new Router();

/// USERS ///
// List users
API.add("GET", "/users", (req, res) => {
  res.send(501, `not implemented`);
});
// Create user
API.add("POST", "/users/:user", (req, res) => {
  res.send(501, `not implemented`);
});
// Delete user
API.add("DELETE", "/users/user", (req, res) => {
  res.send(501, `not implemented`);
});

/// Namespaces ///
// List namespaces
API.add("GET", "/:user", (req, res) => {
  res.send(501, `not implemented`);
});
// Create namespace
API.add("POST", "/:user/:namespace", (req, res) => {
  res.send(501, `not implemented`);
});
// Delete namespace
API.add("DELETE", "/:user/:namespace", (req, res) => {
  res.send(501, `not implemented`);
});

/// IDs ///
// List IDs
API.add("GET", "/:user/:namespace", (req, res) => {
  res.send(501, `not implemented`);
});
// Create ID
API.add("POST", "/:user/:namespace", (req, res) => {
  res.send(501, `not implemented`);
});
// Delete ID
API.add("DELETE", "/:user/:namespace/:id", (req, res) => {
  res.send(501, `not implemented`);
});

listen(API.run);
