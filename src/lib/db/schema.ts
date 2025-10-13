import {
  pgTable,
  text,
  uuid,
  integer,
  timestamp,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Enum for delivery item status
export const statusEnum = pgEnum('status', [
  'TO_DO',
  'EDITING',
  'DELIVERED',
  'ARCHIVED',
]);

// Users table (for Auth.js)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  created_at: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// User settings (per-user deadline preferences)
export const userSettings = pgTable('user_settings', {
  user_id: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  default_deadline_days: integer('default_deadline_days')
    .notNull()
    .default(30),
  timezone: text('timezone').notNull().default('UTC'), // IANA timezone name
  created_at: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Delivery items (core entity)
export const deliveryItems = pgTable('delivery_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  client_name: text('client_name').notNull(),
  shoot_date: date('shoot_date').notNull(),
  computed_deadline: timestamp('computed_deadline', {
    withTimezone: true,
  }).notNull(),
  custom_deadline: timestamp('custom_deadline', { withTimezone: true }),
  notes: text('notes'),
  status: statusEnum('status').notNull().default('TO_DO'),
  delivered_at: timestamp('delivered_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// TypeScript types inferred from schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export type DeliveryItem = typeof deliveryItems.$inferSelect;
export type NewDeliveryItem = typeof deliveryItems.$inferInsert;
