ALTER TABLE referral_recipients ADD COLUMN receiving_facility_id text REFERENCES facilities(id);
--> statement-breakpoint
CREATE TABLE referral_deliveries (
 id text PRIMARY KEY REFERENCES referrals(id) ON DELETE CASCADE,
 facility_id text NOT NULL REFERENCES facilities(id),
 receiving_facility_id text REFERENCES facilities(id),
 attachments jsonb NOT NULL DEFAULT '[]',
 decision text,
 decided_by text REFERENCES users(id),
 decided_at timestamptz,
 recipient_id text NOT NULL REFERENCES referral_recipients(id),
 requested_by text NOT NULL REFERENCES users(id),
 consent_at timestamptz NOT NULL,
 connector_fingerprint text NOT NULL,
 mode text NOT NULL,
 state text NOT NULL DEFAULT 'QUEUED',
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 lease_id text,
 receipt_id text,
 received_at timestamptz,
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX referral_delivery_due_idx ON referral_deliveries(state,next_attempt_at);
--> statement-breakpoint
CREATE INDEX referral_delivery_facility_idx ON referral_deliveries(facility_id,created_at);
