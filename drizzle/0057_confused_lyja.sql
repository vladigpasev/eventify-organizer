ALTER TABLE "sellers" DROP CONSTRAINT "sellers_sellerEmail_unique";--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "eventUuid" varchar(255) NOT NULL;