CREATE TABLE "public"."jobs" (
  "id"              bigint                   NOT NULL DEFAULT nextval('public.jobs_id_seq'::regclass),
  "job_base_number" text                     NOT NULL,
  "job_suffix"      text,
  "job_number"      text                     GENERATED ALWAYS AS ((job_base_number || COALESCE(('-'::text || job_suffix), ''::text))) STORED NOT NULL,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "sales_order_id"  bigint,
  "prod_id"         bigint,
  "installation_id" bigint,
  "is_active"       boolean                  NOT NULL DEFAULT true,
  CONSTRAINT "fk_installation_id" FOREIGN KEY (installation_id) REFERENCES public.installation(installation_id) ON DELETE SET NULL,
  CONSTRAINT "jobs_installation_id_key" UNIQUE (installation_id),
  CONSTRAINT "jobs_job_number_key" UNIQUE (job_number),
  CONSTRAINT "jobs_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_jobs_sales_order_id" UNIQUE (sales_order_id),
  CONSTRAINT "jobs_prod_id_fkey" FOREIGN KEY (prod_id) REFERENCES public.production_schedule(prod_id) ON DELETE SET NULL,
  CONSTRAINT "fk_jobs_sales_order_id" FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE RESTRICT
);

ALTER TABLE "public"."jobs"
  ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE "public"."jobs_id_seq" OWNED BY "public"."jobs"."id";

CREATE INDEX idx_jobs_base_number ON public.jobs USING btree (job_base_number);

CREATE INDEX idx_jobs_installation_id ON public.jobs USING btree (installation_id);

CREATE INDEX idx_jobs_prod_id ON public.jobs USING btree (prod_id);

CREATE INDEX idx_jobs_sales_order_id ON public.jobs USING btree (sales_order_id);

CREATE INDEX jobs_job_number_idx ON public.jobs USING btree (job_number);

CREATE TRIGGER create_production_link
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.create_production_schedule_for_new_job();

CREATE TRIGGER on_job_created_create_purchasing
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_job_purchasing();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_create_installation_record
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_job_installation();

CREATE POLICY "Enable delete for admin only" ON "public"."jobs"
  FOR DELETE
  TO PUBLIC
  USING ((public.clerk_user_role() = 'admin'::text));

CREATE POLICY "Enable insert for sales editors" ON "public"."jobs"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text])));

CREATE POLICY "Enable read access for authenticated users" ON "public"."jobs"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Enable update for sales editors" ON "public"."jobs"
  FOR UPDATE
  TO PUBLIC
  USING ((public.clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text])));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."jobs" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."jobs" TO "service_role";

REVOKE ALL ON TABLE "public"."jobs" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."jobs" TO "postgres";
