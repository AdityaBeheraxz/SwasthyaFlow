ALTER TABLE facilities ADD COLUMN settings jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
CREATE TABLE processing_metrics (id text PRIMARY KEY, facility_id text NOT NULL REFERENCES facilities(id), stage text NOT NULL, duration_ms integer NOT NULL, succeeded boolean NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE INDEX processing_metrics_facility_created_idx ON processing_metrics (facility_id, created_at);
