# d1-id

## Spec

### Create/delete/list users
POST /users/:user
DELETE /users/:user
GET /users

### Create/delete/list namespaces for user
POST /jhands/:namespace
DELETE /jhands/:namespace
GET /jhands

### Create/delete/list IDs for namespace
POST /jhands/:namespace/new
DELETE /jhands/:namespace/:id
GET /jhands/:namespace