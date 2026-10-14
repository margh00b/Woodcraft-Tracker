CREATE TABLE "public"."job_attachments" (
  "id"          bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "job_id"      bigint                   NOT NULL,
  "file_name"   text                     NOT NULL,
  "file_path"   text                     NOT NULL,
  "file_type"   text                     NOT NULL,
  "file_size"   bigint,
  "uploaded_by" text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "category"    text                     NOT NULL DEFAULT 'General'::text,
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "job_attachments_pkey" PRIMARY KEY (id),
  CONSTRAINT "job_attachments_job_id_fkey" FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE
);

ALTER TABLE "public"."job_attachments"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.job_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "Enable all operations for authenticated users" ON "public"."job_attachments"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON SEQUENCE "public"."job_attachments_id_seq" FROM "anon";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."job_attachments_id_seq" TO "anon";

REVOKE ALL ON SEQUENCE "public"."job_attachments_id_seq" FROM "authenticated";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."job_attachments_id_seq" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."job_attachments_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."job_attachments_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."job_attachments_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."job_attachments_id_seq" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."job_attachments" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."job_attachments" TO "service_role";

REVOKE ALL ON TABLE "public"."job_attachments" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."job_attachments" TO "postgres";
