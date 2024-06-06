ALTER TABLE "paperTickets" ADD COLUMN "assignedCustomer" varchar(100);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "paperTickets" ADD CONSTRAINT "paperTickets_assignedCustomer_eventCustomers_uuid_fk" FOREIGN KEY ("assignedCustomer") REFERENCES "eventCustomers"("uuid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
