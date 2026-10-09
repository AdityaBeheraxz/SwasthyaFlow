-- Trigger functions use a fixed path and are not callable through browser roles.
ALTER FUNCTION public.block_audit_mutation() SET search_path = pg_catalog, public;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.block_audit_mutation() FROM PUBLIC;
--> statement-breakpoint
ALTER FUNCTION public.set_audit_facility() SET search_path = pg_catalog, public;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.set_audit_facility() FROM PUBLIC;
--> statement-breakpoint
DO $$
DECLARE api_role text;
BEGIN
 FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
   EXECUTE format('REVOKE EXECUTE ON FUNCTION public.block_audit_mutation() FROM %I',api_role);
   EXECUTE format('REVOKE EXECUTE ON FUNCTION public.set_audit_facility() FROM %I',api_role);
  END IF;
 END LOOP;
END $$;
