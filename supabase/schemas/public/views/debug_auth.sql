CREATE VIEW "public"."debug_auth" AS  SELECT auth.uid() AS user_id,
    (auth.jwt() ->> 'user_role'::text) AS role_in_jwt,
    auth.jwt() AS full_token_payload;

GRANT SELECT ON TABLE "public"."debug_auth" TO PUBLIC;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debug_auth" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debug_auth" TO "service_role";

REVOKE ALL ON TABLE "public"."debug_auth" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debug_auth" TO "postgres";
