CREATE TABLE IF NOT EXISTS "fasching_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_code" varchar(50) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"contact_phone" varchar(30) NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"agreed_to_terms" boolean DEFAULT false NOT NULL,
	"agreed_to_privacy" boolean DEFAULT false NOT NULL,
	"agreed_to_cookies" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fasching_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"ticket_type" varchar(20) NOT NULL,
	"guest_first_name" varchar(255) NOT NULL,
	"guest_last_name" varchar(255) NOT NULL,
	"guest_email" varchar(255) NOT NULL,
	"guest_class_group" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fasching_tickets" ADD CONSTRAINT "fasching_tickets_request_id_fasching_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "fasching_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
