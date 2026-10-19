CREATE SCHEMA IF NOT EXISTS "insite";

COMMENT ON SCHEMA "insite" IS 'Insite mobile app schema';
REVOKE ALL ON SCHEMA "insite" FROM PUBLIC;
GRANT USAGE ON SCHEMA "insite" TO PUBLIC;
GRANT USAGE ON SCHEMA "insite" TO "anon", "authenticated", "service_role";