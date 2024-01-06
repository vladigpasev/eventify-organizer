import { pgTable, serial, varchar, text, uuid, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').default(`uuid_generate_v4()`).unique(),
  firstname: varchar('firstname', { length: 50 }),
  lastname: varchar('lastname', { length: 50 }),
  company: varchar('company', { length: 100 }),
  email: varchar('email', { length: 100 }).unique(),
  password: text('password'),
  email_verified: boolean('email_verified').default(false),
  sentVerification: boolean('sentVerification').default(false),
  verification_token: text('verification_token'),
});