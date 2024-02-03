CREATE TABLE IF NOT EXISTS "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT 'uuid_generate_v4()',
	"eventName" varchar(50) NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"thumbnailUrl" varchar(100) NOT NULL,
	"location" varchar(100) NOT NULL,
	"isFree" boolean DEFAULT false,
	"price" integer,
	CONSTRAINT "events_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "firstname" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "lastname" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL;