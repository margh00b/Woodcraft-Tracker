CREATE TABLE "public"."door_styles" (
  "id"                  bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "name"                text                     NOT NULL,
  "is_pre_manufactured" boolean                  NOT NULL DEFAULT false,
  "is_made_in_house"    boolean                  NOT NULL DEFAULT false,
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "door_styles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."door_styles"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.door_styles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "Enable delete for admin only" ON "public"."door_styles"
  FOR DELETE
  TO PUBLIC
  USING ((public.clerk_user_role() = 'admin'::text));

CREATE POLICY "Enable insert for sales editors" ON "public"."door_styles"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text])));

CREATE POLICY "Enable read access for authenticated users" ON "public"."door_styles"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Enable update for sales editors" ON "public"."door_styles"
  FOR UPDATE
  TO PUBLIC
  USING ((public.clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text])));

REVOKE ALL ON SEQUENCE "public"."door_styles_id_seq" FROM "anon";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."door_styles_id_seq" TO "anon";

REVOKE ALL ON SEQUENCE "public"."door_styles_id_seq" FROM "authenticated";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."door_styles_id_seq" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."door_styles_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."door_styles_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."door_styles_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."door_styles_id_seq" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."door_styles" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."door_styles" TO "service_role";

REVOKE ALL ON TABLE "public"."door_styles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."door_styles" TO "postgres";
