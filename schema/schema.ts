//Copyright (C) 2024  Vladimir Pasev
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
  payoutId: varchar('payoutId', { length: 100 }),
  customerId: varchar('customerId', { length: 100 }),
  planType: varchar('planType', { length: 100 }).default("Hobby"),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').default(`uuid_generate_v4()`).unique(),
  eventName: varchar('eventName', { length: 20 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description').notNull(),
  thumbnailUrl: varchar('thumbnailUrl', { length: 100 }).notNull(),
  location: varchar('location', { length: 100 }).notNull(),
  eventCoordinates: varchar('eventCoordinates', { length: 100 }),
  isFree: boolean('isFree').default(false),
  price: numeric('price', { precision: 10, scale: 2 }),
  userUuid: varchar('userUuid', { length: 100 }).notNull(),
  dateTime: varchar('dateTime', { length: 100 }).notNull(),
  visibility: varchar('visibility', { length: 100 }).notNull().default("public"),
  //@ts-ignore
  updatedAt: timestamp('updated_at').default(`now()`),
});

export const eventCustomers = pgTable('eventCustomers', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').default(`uuid_generate_v4()`).unique(),
  firstname: varchar('firstname', { length: 50 }).notNull(),
  lastname: varchar('lastname', { length: 50 }).notNull(),
  email: varchar('email', { length: 100 }).notNull(),
  guestCount: numeric('guestCount').notNull().default('1'),
  eventUuid: varchar('eventUuid', { length: 100 }).notNull(),
  ticketToken: varchar('ticketToken', { length: 255 }), // New field for the ticket token
  isEntered: boolean('isEntered').default(false),
  clerkUserId: varchar('clerkUserId', { length: 100 }),
  hidden: boolean('hidden').default(false),
  rated: boolean('rated').default(false),
  sentEmail: boolean('sentEmail').default(false),
  isPaperTicket: boolean('isPaperTicket').default(false),
  paperTicket: varchar('paperTicket', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(), // Added createdAt field
});

export const paperTickets = pgTable('paperTickets', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').default(`uuid_generate_v4()`).unique(),
  eventUuid: varchar('eventUuid', { length: 100 }).notNull(),
  assignedCustomer: varchar('assignedCustomer', { length: 255 }),
  nineDigitCode: varchar('nineDigitCode', { length: 9 }).notNull().unique(),
});


export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').default(`uuid_generate_v4()`).unique(),
  commentText: text('comment_text').notNull(),
  eventId: uuid('event_id').notNull(),
  userName: varchar('userName', { length: 100 }),
  //@ts-ignore
  createdAt: timestamp('created_at').default(`now()`),
  //@ts-ignore
  updatedAt: timestamp('updated_at').default(`now()`),
});

export const ratings = pgTable('ratings', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').default(`uuid_generate_v4()`).unique(),
  ticketToken: varchar('ticketToken', { length: 255 }).notNull().unique(),
  rating: numeric('rating'),
  feedback: text('feedback'),
});