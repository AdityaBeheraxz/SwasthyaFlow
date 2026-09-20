CREATE TABLE IF NOT EXISTS "facilities" ("id" text PRIMARY KEY, "name" text NOT NULL, "type" text NOT NULL, "location" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" ("id" text PRIMARY KEY, "name" text NOT NULL, "role" text NOT NULL, "facility_id" text REFERENCES "facilities"("id"), "created_at" timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patients" ("id" text PRIMARY KEY, "anonymous_patient_id" text NOT NULL UNIQUE, "age" integer NOT NULL, "sex" text, "preferred_language" text NOT NULL, "consent_status" boolean NOT NULL DEFAULT false, "created_at" timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encounters" ("id" text PRIMARY KEY, "patient_id" text NOT NULL REFERENCES "patients"("id"), "chief_complaint" text NOT NULL DEFAULT '', "symptoms" jsonb NOT NULL DEFAULT '[]'::jsonb, "timeline" jsonb NOT NULL DEFAULT '[]'::jsonb, "priority" text, "priority_final" text, "priority_source" text, "status" text NOT NULL DEFAULT 'DRAFT', "state" text NOT NULL DEFAULT 'DRAFT', "facility_id" text REFERENCES "facilities"("id"), "created_at" timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inputs" ("id" text PRIMARY KEY, "encounter_id" text NOT NULL REFERENCES "encounters"("id"), "type" text NOT NULL, "original_text" text, "transcript" text, "language" text, "source" jsonb, "created_at" timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" ("id" text PRIMARY KEY, "encounter_id" text NOT NULL REFERENCES "encounters"("id"), "file_url" text, "raw_ocr" text, "extracted_data" jsonb, "quality_status" text, "ocr_tokens" jsonb, "created_at" timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "triage_notes" ("id" text PRIMARY KEY, "encounter_id" text NOT NULL REFERENCES "encounters"("id"), "summary" text NOT NULL, "missing_information" jsonb NOT NULL DEFAULT '[]'::jsonb, "follow_up_questions" jsonb NOT NULL DEFAULT '[]'::jsonb, "risk_signals" jsonb NOT NULL DEFAULT '[]'::jsonb, "priority" text NOT NULL, "field_sources" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews" ("id" text PRIMARY KEY, "encounter_id" text NOT NULL REFERENCES "encounters"("id"), "reviewer_id" text NOT NULL REFERENCES "users"("id"), "changes" jsonb NOT NULL DEFAULT '{}'::jsonb, "decision" text NOT NULL, "notes" text, "created_at" timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referrals" ("id" text PRIMARY KEY, "encounter_id" text NOT NULL REFERENCES "encounters"("id"), "content" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" ("id" text PRIMARY KEY, "user_id" text, "encounter_id" text, "action" text NOT NULL, "timestamp" timestamptz NOT NULL DEFAULT now(), "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rules_config" ("id" text PRIMARY KEY, "version" integer NOT NULL, "rules" jsonb NOT NULL, "active" boolean NOT NULL DEFAULT false, "created_at" timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "encounters_priority_wait_idx" ON "encounters"("priority_final","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_encounter_time_idx" ON "audit_logs"("encounter_id","timestamp");
