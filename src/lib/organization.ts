import { getDatabase } from "@/lib/app-user";

export const DEFAULT_ORGANIZATION_NAME = "AOMA";

export async function getOrganizationName() {
  const result = await getDatabase().query<{ name: string }>(
    "SELECT name FROM organization_settings WHERE singleton = true",
  );
  return result.rows[0]?.name ?? DEFAULT_ORGANIZATION_NAME;
}

export async function getOrganizationBranding() {
  const result = await getDatabase().query<{ name: string; logo_storage_key: string | null; logo_updated_at: Date | null }>(
    "SELECT name, logo_storage_key, logo_updated_at FROM organization_settings WHERE singleton = true",
  );
  const row = result.rows[0];
  return {
    name: row?.name ?? DEFAULT_ORGANIZATION_NAME,
    hasCustomLogo: Boolean(row?.logo_storage_key),
    logoVersion: row?.logo_updated_at?.getTime() ?? 0,
  };
}
