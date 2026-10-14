CREATE TABLE "public"."client" (
  "id"         integer                  NOT NULL DEFAULT nextval('public.client_id_seq'::regclass),
  "designer"   text,
  "firstName"  text,
  "lastName"   text                     NOT NULL,
  "street"     text,
  "city"       text,
  "province"   text,
  "zip"        text,
  "phone1"     text,
  "phone2"     text,
  "email1"     text,
  "email2"     text,
  "createdAt"  timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt"  timestamp with time zone NOT NULL DEFAULT now(),
  "legacy_id"  text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "client_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_client_legacy_id" UNIQUE (legacy_id)
);

ALTER TABLE "public"."client"
  ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE "public"."client_id_seq" OWNED BY "public"."client"."id";

CREATE INDEX idx_client_legacy_id ON public.client USING btree (legacy_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.client
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "Enable delete for admin only" ON "public"."client"
  FOR DELETE
  TO PUBLIC
  USING ((public.clerk_user_role() = 'admin'::text));

CREATE POLICY "Enable insert for client editors" ON "public"."client"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'installation'::text, 'service'::text, 'reception'::text])));

CREATE POLICY "Enable read access for authenticated users" ON "public"."client"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Enable update for client editors" ON "public"."client"
  FOR UPDATE
  TO PUBLIC
  USING ((public.clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'installation'::text, 'service'::text, 'reception'::text])));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."client" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."client" TO "service_role";

REVOKE ALL ON TABLE "public"."client" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."client" TO "postgres";
