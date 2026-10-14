CREATE SEQUENCE "public"."sales_order_sequence" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 10000 CACHE 1 NO CYCLE;

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."sales_order_sequence" TO "anon", "authenticated";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."sales_order_sequence" TO "service_role";

REVOKE ALL ON SEQUENCE "public"."sales_order_sequence" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."sales_order_sequence" TO "postgres";
