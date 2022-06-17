export const schema = [
  `CREATE TABLE IF NOT EXISTS users ( 
        username             VARCHAR(100) NOT NULL,
        created_on           INTEGER NOT NULL,
        CONSTRAINT unq_users_username UNIQUE ( username )
        PRIMARY KEY ( username )
    );`,
  `CREATE TABLE IF NOT EXISTS namespaces ( 
        name                 VARCHAR(100) NOT NULL,
        created_on           INTEGER NOT NULL,
        username             VARCHAR(100) NOT NULL,
        CONSTRAINT unq_namespaces_name UNIQUE ( username,name ),
        PRIMARY KEY ( username, name ),
        FOREIGN KEY ( username ) REFERENCES users( username ) ON DELETE CASCADE ON UPDATE CASCADE
    );`,
  `CREATE TABLE IF NOT EXISTS ids ( 
        id                   VARCHAR(100) NOT NULL,
        created_on           INTEGER NOT NULL,
        namespace            VARCHAR(100) NOT NULL,
        username             VARCHAR(100) NOT NULL,
        CONSTRAINT unq_ids_name UNIQUE ( namespace,id ),
        PRIMARY KEY ( namespace, id )
        FOREIGN KEY ( username,namespace ) REFERENCES namespaces( username,name ) ON DELETE CASCADE ON UPDATE CASCADE
    );`,
];
