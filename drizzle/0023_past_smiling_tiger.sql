DROP TABLE "event_log";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lastProcessedEventId" varchar(100);