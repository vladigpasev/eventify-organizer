CREATE TABLE IF NOT EXISTS "eventCustomers" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT 'uuid_generate_v4()',
	"firstname" varchar(50) NOT NULL,
	"lastname" varchar(50) NOT NULL,
	"email" varchar(100) NOT NULL,
	"guestCount" numeric DEFAULT '1' NOT NULL,
	CONSTRAINT "eventCustomers_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "eventCustomers_email_unique" UNIQUE("email")
);
