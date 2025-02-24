//Copyright (C) 2024  Vladimir Pasev
import { relations } from 'drizzle-orm';
import { pgTable, serial, varchar, text, uuid, boolean, timestamp, numeric, integer } from 'drizzle-orm/pg-core';

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
  limit: numeric('limit'),
  tombolaPrice: numeric('tombolaPrice', { precision: 10, scale: 2 }),
});

export const sellers = pgTable('sellers', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').default(`uuid_generate_v4()`).unique(),
  sellerEmail: varchar('sellerEmail', { length: 255 }).notNull(),
  eventUuid: varchar('eventUuid', { length: 255 }).notNull(),
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
  sellerUuid: varchar('sellerUuid', { length: 100 }),
  reservation: boolean('reservation').default(false),
  tombola_weight: numeric('tombola_weight'),
  min_tombola_weight: numeric('min_tombola_weight'),
  tombola_seller_uuid: varchar('tombola_seller_uuid', { length: 100 }),
});

export const tombolaItems = pgTable('tombolaItems', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').default(`uuid_generate_v4()`).unique(),
  itemName: varchar('itemName', { length: 255 }).notNull(),
  eventUuid: varchar('eventUuid', { length: 100 }).notNull(),
  winnerUuid: varchar('winnerUuid', { length: 100 }),
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

// ... предишното съдържание

// Добавяме колона "sellerId" във fasching_requests
export const faschingRequests = pgTable("fasching_requests", {
  id: serial("id").primaryKey(),

  paymentCode: varchar("payment_code", { length: 50 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 30 }).notNull(),
  paid: boolean("paid").notNull().default(false),

  // Колона за идентификатор на продавача (кой е маркирал поръчката като платена)
  sellerId: varchar("seller_id", { length: 100 }), // може да е nullable

  // Новите колони за съгласия
  agreedToTerms: boolean("agreed_to_terms").notNull().default(false),
  agreedToPrivacy: boolean("agreed_to_privacy").notNull().default(false),
  agreedToCookies: boolean("agreed_to_cookies").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  deleted: boolean("deleted").notNull().default(false),
});

// Примерно:
export const faschingTickets = pgTable("fasching_tickets", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .references(() => faschingRequests.id)
    .notNull(),
  ticketType: varchar("ticket_type", { length: 20 }).notNull(),    // fasching | fasching_after
  guestFirstName: varchar("guest_first_name", { length: 255 }).notNull(),
  guestLastName: varchar("guest_last_name", { length: 255 }).notNull(),
  guestEmail: varchar("guest_email", { length: 255 }).notNull(),
  guestClassGroup: varchar("guest_class_group", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),

  // 10-цифрен код
  ticketCode: varchar("ticket_code", { length: 10 }),
  guestSchoolName: varchar("guest_school_name", { length: 255 }),   // nullable
  guestExternalGrade: varchar("guest_external_grade", { length: 50 }), // nullable
  // ➜ Новите полета:
  entered_fasching: boolean("entered_fasching").notNull().default(false),
  entered_after: boolean("entered_after").notNull().default(false),
});


// Rелaции (не се променят съществено)
export const faschingRequestsRelations = relations(faschingRequests, ({ many }) => ({
  tickets: many(faschingTickets),
}));

export const faschingTicketsRelations = relations(faschingTickets, ({ one }) => ({
  request: one(faschingRequests, {
    fields: [faschingTickets.requestId],
    references: [faschingRequests.id],
  }),
}));