CREATE TABLE "public"."warehouse_tracking" (
  "id"           bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "job_id"       bigint,
  "dropoff_date" date,
  "pickup_date"  date,
  "pallets"      integer,
  "notes"        text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "warehouse_tracking_job_id_fkey" FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL,
  CONSTRAINT "warehouse_tracking_job_id_key" UNIQUE (job_id),
  CONSTRAINT "warehouse_tracking_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."warehouse_tracking"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.warehouse_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "Enable all access for authenticated users" ON "public"."warehouse_tracking"
  FOR ALL
  TO "authenticated"
  USING (true);

REVOKE ALL ON SEQUENCE "public"."warehouse_tracking_id_seq" FROM "anon";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."warehouse_tracking_id_seq" TO "anon";

REVOKE ALL ON SEQUENCE "public"."warehouse_tracking_id_seq" FROM "authenticated";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."warehouse_tracking_id_seq" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."warehouse_tracking_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."warehouse_tracking_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."warehouse_tracking_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."warehouse_tracking_id_seq" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."warehouse_tracking" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."warehouse_tracking" TO "service_role";

REVOKE ALL ON TABLE "public"."warehouse_tracking" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."warehouse_tracking" TO "postgres";
