import { Router } from "itty-router";
import auth from "./api/auth";

import users from "./api/users";
import namespaces from "./api/namespaces";
import ids from "./api/ids";
import admin from "./api/admin";

import { IRequest, IMethods } from "./api/types";
import { lowerParams } from "./api/util";

const router = Router<IRequest, IMethods>();

/// ADMIN ///
router.post("/schema", auth.admin, admin.updateSchema);
router.get("/admin", auth.admin, admin.getAllData);

/// USERS ///
// Get users
router.get("/users", lowerParams, auth.admin, users.getUsers);
// Create user
router.post("/:user", lowerParams, lowerParams, auth.admin, users.createUser);
// Delete user
router.delete("/:user", lowerParams, auth.admin, users.deleteUser);

/// Namespaces ///
// List namespaces
router.get("/:user", lowerParams, auth.user, namespaces.getNamespaces);
// Create namespace
router.post(
  "/:user/:namespace",
  lowerParams,
  auth.user,
  namespaces.createNamespace
);
// Delete namespace
router.delete(
  "/:user/:namespace",
  lowerParams,
  auth.user,
  namespaces.deleteNamespace
);

/// IDs ///
// List IDs
router.get("/:user/:namespace", lowerParams, auth.user, ids.getIDs);
// Generate ID
router.get("/:user/:namespace/new", lowerParams, auth.user, ids.generateID);
// Add ID
router.post("/:user/:namespace/:id", lowerParams, auth.user, ids.generateID);
// Delete ID
router.delete("/:user/:namespace/:id", lowerParams, auth.user, ids.deleteID);

// Run api
export default {
  fetch: router.handle,
};
