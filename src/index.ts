import { Router } from "itty-router";
import auth from "./api/auth";

import users from "./api/users";
import namespaces from "./api/namespaces";
import ids from "./api/ids";
import admin from "./api/admin";

import { IRequest, IMethods } from "./api/types";

const router = Router<IRequest, IMethods>();

/// ADMIN ///
router.post("/schema", auth.admin, admin.updateSchema);
router.get("/admin", auth.admin, admin.getAllData);

/// USERS ///
// Get users
router.get("/users", auth.admin, users.getUsers);
// Create user
router.post("/:user", auth.admin, users.createUser);
// Delete user
router.delete("/:user", auth.admin, users.deleteUser);

/// Namespaces ///
// List namespaces
router.get("/:user", auth.user, namespaces.getNamespaces);
// Create namespace
router.post("/:user/:namespace", auth.user, namespaces.createNamespace);
// Delete namespace
router.delete("/:user/:namespace", auth.user, namespaces.deleteNamespace);

/// IDs ///
// List IDs
router.get("/:user/:namespace", auth.user, ids.getIDs);
// Create ID
router.get("/:user/:namespace/new", auth.user, ids.createID);
// Delete ID
router.delete("/:user/:namespace/:id", auth.user, ids.deleteID);

// Run api
export default {
  fetch: router.handle,
};
