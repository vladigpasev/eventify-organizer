CREATE TABLE IF NOT EXISTS "sellers" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT 'uuid_generate_v4()',
	"sellerEmail" varchar(255) NOT NULL,
	CONSTRAINT "sellers_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "sellers_sellerEmail_unique" UNIQUE("sellerEmail")
);
