import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().unique(),
  state: text('state').notNull(),
  revision: integer('revision').notNull().default(0),
  lastWrite: text('last_write'),
  updatedAt: text('updated_at').notNull(),
});
export const activity = sqliteTable('activity', {
  id: text('id').primaryKey(),
  playerId: text('player_id').notNull(),
  kind: text('kind').notNull(),
  text: text('text').notNull(),
  createdAt: text('created_at').notNull(),
});
