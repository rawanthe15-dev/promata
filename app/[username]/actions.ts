"use server";

import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { THEMES } from "@/lib/themes";

async function loadOwnedPage(username: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.pages)
    .where(sql`lower(${schema.pages.username}) = ${username.toLowerCase()}`)
    .limit(1);
  const page = rows[0];
  if (!page) return null;
  const jar = await cookies();
  const cookieVal = jar.get(`promata_owner_${page.username}`)?.value;
  if (cookieVal !== page.ownerToken) return null;
  return page;
}

export async function setThemeAction(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const themeName = String(formData.get("theme") ?? "");
  if (!THEMES[themeName]) return;
  const page = await loadOwnedPage(username);
  if (!page) return;

  const db = getDb();
  await db
    .update(schema.pages)
    .set({ theme: themeName, updatedAt: new Date() })
    .where(sql`${schema.pages.id} = ${page.id}`);

  revalidatePath(`/${page.username}`);
}

export async function saveProfileAction(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const hiddenRaw = formData.getAll("hidden");
  const hiddenItems = hiddenRaw
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0);

  const page = await loadOwnedPage(username);
  if (!page) return;

  const db = getDb();
  await db
    .update(schema.pages)
    .set({
      displayName,
      bio,
      hiddenItems,
      updatedAt: new Date(),
    })
    .where(sql`${schema.pages.id} = ${page.id}`);

  revalidatePath(`/${page.username}`);
  revalidatePath(`/${page.username}/edit`);
}
