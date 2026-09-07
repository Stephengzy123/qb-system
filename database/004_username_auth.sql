ALTER TABLE "user"
  ADD COLUMN "username" text,
  ADD COLUMN "displayUsername" text;

CREATE UNIQUE INDEX "user_username_unique" ON "user" (lower("username")) WHERE "username" IS NOT NULL;
