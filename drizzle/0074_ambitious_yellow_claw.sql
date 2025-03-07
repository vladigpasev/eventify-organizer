ALTER TABLE "fasching_tickets" ADD COLUMN "owesforsepare" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "fasching_tickets" ADD COLUMN "separesellerid" varchar(100);