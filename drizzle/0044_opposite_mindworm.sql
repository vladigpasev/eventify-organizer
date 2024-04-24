CREATE TABLE IF NOT EXISTS "ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT 'uuid_generate_v4()',
	"ticketToken" varchar(255) NOT NULL,
	"rating" numeric,
	"feedback" text,
	CONSTRAINT "ratings_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "ratings_ticketToken_unique" UNIQUE("ticketToken")
);
--> statement-breakpoint
ALTER TABLE "eventCustomers" ADD COLUMN "rated" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "eventCustomers" ADD COLUMN "sentEmail" boolean DEFAULT false;