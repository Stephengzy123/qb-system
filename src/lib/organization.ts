import { getDatabase } from "@/lib/app-user";

export const DEFAULT_ORGANIZATION_NAME = "AOMA";

export async function getOrganizationName() {
  const result = await getDatabase().query<{ name: string }>(
    "SELECT name FROM organization_settings WHERE singleton = true",
  );
  return result.rows[0]?.name ?? DEFAULT_ORGANIZATION_NAME;
}
