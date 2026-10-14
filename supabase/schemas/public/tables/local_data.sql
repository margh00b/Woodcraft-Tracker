CREATE TABLE "public"."local_data" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "machine_name" text                     NOT NULL,
  "payload"      jsonb                    NOT NULL,
  "updated_at"   timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "local_data_machine_name_key" UNIQUE (machine_name),
  CONSTRAINT "local_data_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."local_data"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read/write access on local_data" ON "public"."local_data"
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."local_data" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."local_data" TO "service_role";

REVOKE ALL ON TABLE "public"."local_data" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."local_data" TO "postgres";
