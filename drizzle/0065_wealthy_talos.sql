ALTER TABLE "eventCustomers" ADD COLUMN "tombola_weight" numeric;--> statement-breakpoint
ALTER TABLE "eventCustomers" ADD COLUMN "min_tombola_weight" numeric;--> statement-breakpoint
ALTER TABLE "eventCustomers" ADD COLUMN "tombola_seller_uuid" varchar(100);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "tombolaPrice" numeric(10, 2);