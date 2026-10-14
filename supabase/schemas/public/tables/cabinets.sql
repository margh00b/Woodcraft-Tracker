CREATE TABLE "public"."cabinets" (
  "id"                     bigint                   NOT NULL DEFAULT nextval('public.cabinets_id_seq'::regclass),
  "species_name_legacy"    text,
  "color_name_legacy"      text,
  "finish"                 text,
  "glaze"                  text,
  "door_style_name_legacy" text,
  "top_drawer_front"       text,
  "interior"               text,
  "drawer_box"             text,
  "drawer_hardware"        text,
  "box"                    integer,
  "hinge_soft_close"       boolean                  DEFAULT false,
  "doors_parts_only"       boolean                  DEFAULT false,
  "hardware_only"          boolean                  DEFAULT false,
  "handles_supplied"       boolean                  DEFAULT false,
  "handles_selected"       boolean                  DEFAULT false,
  "glass"                  boolean                  DEFAULT false,
  "piece_count"            text,
  "hardware_quantity"      text,
  "glass_type"             text,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "species_id"             bigint,
  "color_id"               bigint,
  "door_style_id"          bigint,
  CONSTRAINT "cabinets_pkey" PRIMARY KEY (id),
  CONSTRAINT "fk_cabinets_colors" FOREIGN KEY (color_id) REFERENCES public.colors("Id"),
  CONSTRAINT "fk_cabinets_door_styles" FOREIGN KEY (door_style_id) REFERENCES public.door_styles(id),
  CONSTRAINT "fk_cabinets_species" FOREIGN KEY (species_id) REFERENCES public.species("Id")
);

ALTER TABLE "public"."cabinets"
  ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE "public"."cabinets_id_seq" OWNED BY "public"."cabinets"."id";

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.cabinets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "Allow INSERT for Admins and Designers on Cabinets" ON "public"."cabinets"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text)));

CREATE POLICY "Allow SELECT for Admins and Designers on Cabinets" ON "public"."cabinets"
  FOR SELECT
  TO PUBLIC
  USING (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text)));

CREATE POLICY "Enable delete for admin only" ON "public"."cabinets"
  FOR DELETE
  TO PUBLIC
  USING ((public.clerk_user_role() = 'admin'::text));

CREATE POLICY "Enable insert for sales editors" ON "public"."cabinets"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text])));

CREATE POLICY "Enable read access for authenticated users" ON "public"."cabinets"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Enable update for sales editors" ON "public"."cabinets"
  FOR UPDATE
  TO PUBLIC
  USING ((public.clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text])));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cabinets" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cabinets" TO "service_role";

REVOKE ALL ON TABLE "public"."cabinets" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cabinets" TO "postgres";
