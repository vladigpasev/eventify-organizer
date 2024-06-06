CREATE TABLE IF NOT EXISTS "paperTickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT 'uuid_generate_v4()',
	"eventUuid" varchar(100) NOT NULL,
	"ticketToken" varchar(255),
	CONSTRAINT "paperTickets_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "eventCustomers" DROP COLUMN IF EXISTS "isActivated";