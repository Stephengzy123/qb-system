import { betterAuth } from "better-auth";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL ?? "postgresql://local:local@127.0.0.1:5432/aoma";
const deploymentHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const auth = betterAuth({
  database: new Pool({ connectionString, max: 3 }),
  secret: process.env.AUTH_SECRET ?? "aoma-local-development-secret-change-me",
  baseURL: process.env.BETTER_AUTH_URL ?? (deploymentHost ? `https://${deploymentHost}` : "http://localhost:3000"),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    database: { joins: true },
  },
});
