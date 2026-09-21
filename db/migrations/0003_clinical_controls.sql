ALTER TABLE "audit_logs" ADD COLUMN "facility_id" text REFERENCES "facilities"("id");
--> statement-breakpoint
ALTER TABLE "audit_logs" DISABLE TRIGGER audit_logs_append_only;
--> statement-breakpoint
UPDATE "audit_logs" a SET "facility_id" = COALESCE((SELECT e."facility_id" FROM "encounters" e WHERE e."id" = a."encounter_id"),(SELECT u."facility_id" FROM "users" u WHERE u."id" = a."user_id"));
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE TRIGGER audit_logs_append_only;
--> statement-breakpoint
CREATE INDEX "audit_logs_facility_timestamp_idx" ON "audit_logs" ("facility_id", "timestamp");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_audit_facility() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.facility_id := COALESCE(NEW.facility_id,(SELECT facility_id FROM encounters WHERE id=NEW.encounter_id),(SELECT facility_id FROM users WHERE id=NEW.user_id)); RETURN NEW; END; $$;
--> statement-breakpoint
CREATE TRIGGER audit_logs_set_facility BEFORE INSERT ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION set_audit_facility();
--> statement-breakpoint
ALTER TABLE "rules_config" ADD COLUMN "facility_id" text REFERENCES "facilities"("id");
--> statement-breakpoint
UPDATE "rules_config" SET "facility_id"='F-001' WHERE "facility_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "rules_config" ALTER COLUMN "facility_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "rules_config" ADD COLUMN "status" text NOT NULL DEFAULT 'DRAFT';
--> statement-breakpoint
ALTER TABLE "rules_config" ADD COLUMN "checksum" text;
--> statement-breakpoint
ALTER TABLE "rules_config" ADD COLUMN "created_by" text REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "rules_config" ADD COLUMN "approved_by" text REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "rules_config" ADD COLUMN "approved_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "rules_config" SET "status"='APPROVED' WHERE "active"=true;
--> statement-breakpoint
