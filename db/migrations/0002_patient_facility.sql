ALTER TABLE "patients" ADD COLUMN "facility_id" text;
--> statement-breakpoint
UPDATE "patients" p SET "facility_id" = e."facility_id" FROM "encounters" e WHERE e."patient_id" = p."id" AND p."facility_id" IS NULL;
--> statement-breakpoint
UPDATE "patients" SET "facility_id" = 'F-001' WHERE "facility_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "facility_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id");
--> statement-breakpoint
CREATE TABLE "patient_id_counters" ("id" text PRIMARY KEY NOT NULL, "next_value" integer NOT NULL DEFAULT 1001);
--> statement-breakpoint
INSERT INTO "patient_id_counters" ("id", "next_value") SELECT 'global', 1001 + COUNT(*) FROM "patients";
--> statement-breakpoint
CREATE TABLE "rate_limit_events" ("id" text PRIMARY KEY NOT NULL, "key" text NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL);
--> statement-breakpoint
CREATE INDEX "rate_limit_events_key_created_idx" ON "rate_limit_events" ("key", "created_at");
--> statement-breakpoint
