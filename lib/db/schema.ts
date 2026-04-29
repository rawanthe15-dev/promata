import { pgTable, text, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ParsedSheet } from "../sheets";

export const pages = pgTable(
  "pages",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    username: text("username").notNull(),
    sheetUrl: text("sheet_url").notNull(),
    spreadsheetId: text("spreadsheet_id").notNull(),
    gid: text("gid"),
    ownerToken: text("owner_token").notNull(),
    displayName: text("display_name"),
    bio: text("bio"),
    theme: text("theme").default("default"),
    hiddenItems: jsonb("hidden_items").$type<number[]>().default(sql`'[]'::jsonb`).notNull(),
    data: jsonb("data").$type<ParsedSheet>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    usernameIdx: uniqueIndex("pages_username_lower_idx").on(sql`lower(${t.username})`),
  })
);

export type PageRow = typeof pages.$inferSelect;
export type NewPageRow = typeof pages.$inferInsert;
