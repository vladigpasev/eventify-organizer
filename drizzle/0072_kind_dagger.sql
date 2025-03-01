CREATE TABLE IF NOT EXISTS "fasching_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"category_id" varchar(50) NOT NULL,
	"nominee_id" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "fasching_tickets" ALTER COLUMN "ticket_code" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "fasching_tickets" ADD COLUMN "vote_token" varchar(255);--> statement-breakpoint
ALTER TABLE "fasching_tickets" ADD COLUMN "voted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "isFaschingAdmin" boolean DEFAULT false;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fv_category" ON "fasching_votes" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fv_cat_nom" ON "fasching_votes" ("category_id","nominee_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fasching_votes" ADD CONSTRAINT "fasching_votes_ticket_id_fasching_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "fasching_tickets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
