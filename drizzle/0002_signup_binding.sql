ALTER TABLE "email_tokens" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "email_tokens" ADD COLUMN "nonce_hash" text;