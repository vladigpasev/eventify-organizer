CREATE TABLE IF NOT EXISTS "tombolaItems" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT 'uuid_generate_v4()',
	"itemName" varchar(255) NOT NULL,
	"eventUuid" varchar(100) NOT NULL,
	"winnerUuid" varchar(100),
	CONSTRAINT "tombolaItems_uuid_unique" UNIQUE("uuid")
);
