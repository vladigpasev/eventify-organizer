CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"firstname" varchar(50),
	"lastname" varchar(50),
	"company" varchar(100),
	"email" varchar(100),
	"password" text,
	"full_name" text,
	"phone" varchar(256),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
