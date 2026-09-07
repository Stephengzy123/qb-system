ALTER TABLE users ADD COLUMN username text;

UPDATE users au
   SET username = bu."username"
  FROM "user" bu
 WHERE bu."id" = au.auth_subject
   AND bu."username" IS NOT NULL;

CREATE UNIQUE INDEX users_username_unique ON users (lower(username)) WHERE username IS NOT NULL;
