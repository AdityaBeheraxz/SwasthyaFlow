ALTER TABLE "reports" ADD COLUMN "file_name" text;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "file_mime_type" text;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "file_size" integer;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "file_sha256" text;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "page_count" integer;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "quality_warnings" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "reviewed_text" text;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "reviewed_by" text REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "reviewed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "ocr_engine" text;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "ocr_confidence_permille" integer;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "ocr_completed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "ocr_error" text;
