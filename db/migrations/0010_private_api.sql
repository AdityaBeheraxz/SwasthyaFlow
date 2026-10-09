-- All application data is accessed through authenticated, facility-scoped server APIs.
-- Supabase's browser roles must not read or mutate these tables directly.
DO $$
DECLARE table_name text; api_role text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['facilities','users','patient_id_counters','patients','encounters','inputs','reports','triage_notes','reviews','referral_recipients','referrals','audit_logs','rules_config','rate_limit_events','processing_metrics','referral_deliveries'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC',table_name);
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I',table_name,api_role);
   END IF;
  END LOOP;
 END LOOP;
END $$;
