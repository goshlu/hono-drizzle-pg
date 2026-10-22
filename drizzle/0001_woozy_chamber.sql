ALTER TABLE "users" ALTER COLUMN "name" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(20) DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "age";