ALTER TABLE "users" RENAME COLUMN "id" TO "uuid";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "uuid" SET DATA TYPE varchar(256);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "uuid" SET DEFAULT (uuid());