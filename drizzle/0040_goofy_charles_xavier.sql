ALTER TABLE "events" ADD COLUMN "updated_at" timestamp DEFAULT 'now()';--> statement-breakpoint
ALTER TABLE "comments" DROP COLUMN IF EXISTS "is_deleted";