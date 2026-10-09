ALTER TABLE patients ADD COLUMN name text;
--> statement-breakpoint
ALTER TABLE reports ADD COLUMN document_type text NOT NULL DEFAULT 'report';
