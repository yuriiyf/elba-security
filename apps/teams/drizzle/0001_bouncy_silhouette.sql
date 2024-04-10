ALTER TABLE "channels" RENAME COLUMN "membershipType" TO "membership_type";--> statement-breakpoint
ALTER TABLE "channels" RENAME COLUMN "displayName" TO "display_name";--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "channel_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" DROP COLUMN IF EXISTS "messages";