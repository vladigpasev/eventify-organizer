ALTER TABLE "comments" ALTER COLUMN "created_at" SET DEFAULT 'now()';--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "updated_at" SET DEFAULT 'now()';