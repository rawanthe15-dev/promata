import { sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export async function loadPageByUsername(username: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.pages)
    .where(sql`lower(${schema.pages.username}) = ${username.toLowerCase()}`)
    .limit(1);
  return rows[0] ?? null;
}
