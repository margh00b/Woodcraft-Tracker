CREATE TABLE "public"."site_visits" (
  "id"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "job_id"     bigint,
  "visit_date" date                     NOT NULL,
  "notes"      text,
  "created_by" text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "site_visits_job_id_fkey" FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL,
  CONSTRAINT "site_visits_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."site_visits"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.site_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "Enable all access for authenticated users" ON "public"."site_visits"
  FOR ALL
  TO "authenticated"
  USING (true);

REVOKE ALL ON SEQUENCE "public"."site_visits_id_seq" FROM "anon";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."site_visits_id_seq" TO "anon";

REVOKE ALL ON SEQUENCE "public"."site_visits_id_seq" FROM "authenticated";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."site_visits_id_seq" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."site_visits_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."site_visits_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."site_visits_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."site_visits_id_seq" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."site_visits" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."site_visits" TO "service_role";

REVOKE ALL ON TABLE "public"."site_visits" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."site_visits" TO "postgres";
