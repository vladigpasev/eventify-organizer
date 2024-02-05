import { pgTable, serial, varchar, text, uuid, boolean, timestamp, numeric } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').default(`uuid_generate_v4()`).unique(),
  firstname: varchar('firstname', { length: 50 }).notNull(),
  lastname: varchar('lastname', { length: 50 }).notNull(),
  company: varchar('company', { length: 100 }),
  email: varchar('email', { length: 100 }).unique().notNull(),
  password: text('password').notNull(),
  email_verified: boolean('email_verified').default(false),
  sentVerification: boolean('sentVerification').default(false),
  verification_token: text('verification_token'),
  reset_token: text('reset_token'),
  lastEmailSentAt: timestamp('last_email_sent_at'),
  setpayment: boolean('setpayment').default(false),
  payoutCompleted: boolean('payoutCompleted').default(false),
  payoutId: varchar('payoutId', { length: 100 })
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').default(`uuid_generate_v4()`).unique(),
  eventName: varchar('eventName', { length: 50 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description').notNull(),
  thumbnailUrl: varchar('thumbnailUrl', { length: 100 }).notNull(),
  location: varchar('location', {length: 100}).notNull(),
  isFree: boolean('isFree').default(false),
  price: numeric('price', { precision: 10, scale: 2 }),
});
