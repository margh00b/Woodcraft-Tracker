CREATE TABLE "public"."homeowners_info" (
  "id"                bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "job_id"            bigint                   NOT NULL,
  "homeowner_name"    text,
  "homeowner_phone"   text,
  "homeowner_email"   text,
  "homeowner_details" text,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "homeowners_info_job_id_key" UNIQUE (job_id),
  CONSTRAINT "homeowners_info_pkey" PRIMARY KEY (id),
  CONSTRAINT "homeowners_info_job_id_fkey" FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);

ALTER TABLE "public"."homeowners_info"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.homeowners_info
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "Enable delete for admin and service" ON "public"."homeowners_info"
  FOR DELETE
  TO PUBLIC
  USING ((public.clerk_user_role() = ANY (ARRAY['admin'::text, 'service'::text])));

CREATE POLICY "Enable insert for service editors" ON "public"."homeowners_info"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.clerk_user_role() = ANY (ARRAY['admin'::text, 'installation'::text, 'service'::text])));

CREATE POLICY "Enable read access for authenticated users" ON "public"."homeowners_info"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Enable update for service editors" ON "public"."homeowners_info"
  FOR UPDATE
  TO PUBLIC
  USING ((public.clerk_user_role() = ANY (ARRAY['admin'::text, 'installation'::text, 'service'::text])));

REVOKE ALL ON SEQUENCE "public"."homeowners_info_id_seq" FROM "anon";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."homeowners_info_id_seq" TO "anon";

REVOKE ALL ON SEQUENCE "public"."homeowners_info_id_seq" FROM "authenticated";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."homeowners_info_id_seq" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."homeowners_info_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."homeowners_info_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."homeowners_info_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."homeowners_info_id_seq" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."homeowners_info" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."homeowners_info" TO "service_role";

REVOKE ALL ON TABLE "public"."homeowners_info" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."homeowners_info" TO "postgres";
