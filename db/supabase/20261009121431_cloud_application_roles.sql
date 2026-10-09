-- Supabase bootstrap only. Secrets are configured separately and never stored in migrations.
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='swasthyaflow_app') THEN
  CREATE ROLE swasthyaflow_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT CONNECTION LIMIT 30;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='swasthyaflow_migrator') THEN
  CREATE ROLE swasthyaflow_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT CONNECTION LIMIT 3;
 END IF;
END $$;
GRANT swasthyaflow_migrator TO postgres;
GRANT CONNECT ON DATABASE postgres TO swasthyaflow_app, swasthyaflow_migrator;
GRANT USAGE ON SCHEMA public TO swasthyaflow_app, swasthyaflow_migrator;
GRANT CREATE ON SCHEMA public TO swasthyaflow_migrator;
ALTER ROLE swasthyaflow_app SET search_path = pg_catalog, public;
ALTER ROLE swasthyaflow_app SET statement_timeout = '30s';
ALTER ROLE swasthyaflow_app SET idle_in_transaction_session_timeout = '30s';
DO $$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['facilities','users','patient_id_counters','patients','encounters','inputs','reports','triage_notes','reviews','referral_recipients','referrals','audit_logs','rules_config','rate_limit_events','processing_metrics','referral_deliveries'] LOOP
  EXECUTE format('ALTER TABLE public.%I OWNER TO swasthyaflow_migrator',table_name);
  IF table_name='audit_logs' THEN
   EXECUTE format('GRANT SELECT, INSERT ON TABLE public.%I TO swasthyaflow_app',table_name);
  ELSE
   EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO swasthyaflow_app',table_name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=table_name AND policyname='swasthyaflow_server_access') THEN
   EXECUTE format('CREATE POLICY swasthyaflow_server_access ON public.%I FOR ALL TO swasthyaflow_app USING (true) WITH CHECK (true)',table_name);
  END IF;
 END LOOP;
END $$;
ALTER FUNCTION public.block_audit_mutation() OWNER TO swasthyaflow_migrator;
ALTER FUNCTION public.set_audit_facility() OWNER TO swasthyaflow_migrator;
ALTER SCHEMA drizzle OWNER TO swasthyaflow_migrator;
ALTER TABLE drizzle.__drizzle_migrations OWNER TO swasthyaflow_migrator;
REVOKE ALL ON SCHEMA drizzle FROM PUBLIC, anon, authenticated, swasthyaflow_app;
ALTER DEFAULT PRIVILEGES FOR ROLE swasthyaflow_migrator IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE swasthyaflow_migrator IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
