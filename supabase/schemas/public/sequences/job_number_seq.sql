CREATE SEQUENCE "public"."job_number_seq" AS bigint INCREMENT BY 1 MINVALUE 40000 MAXVALUE 9999999 START WITH 40000 CACHE 1 NO CYCLE;

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."job_number_seq" TO "anon", "authenticated";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."job_number_seq" TO "service_role";

REVOKE ALL ON SEQUENCE "public"."job_number_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."job_number_seq" TO "postgres";
