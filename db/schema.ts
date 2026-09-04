import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const favoriteSentiments = sqliteTable(
  "favorite_sentiments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    itemKey: text("item_key").notNull(),
    itemType: text("item_type").notNull(),
    itemName: text("item_name").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_favorite_sentiments_user_item").on(table.userId, table.itemKey),
    index("idx_favorite_sentiments_user_created").on(table.userId, table.createdAt),
  ],
);
