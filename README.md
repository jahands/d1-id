# d1-id

## Spec

### List/create/delete users
GET /users
POST /users/:user
DELETE /users/:user

### List/create/delete namespaces for user
GET /jhands
POST /jhands/:namespace
DELETE /jhands/:namespace

### List/create/delete IDs for namespace
GET /jhands/:namespace
POST /jhands/:namespace/new
DELETE /jhands/:namespace/:id