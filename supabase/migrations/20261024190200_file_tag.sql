ALTER TABLE "public"."job_attachments"
  ADD COLUMN "file_tag" text DEFAULT 'General'::text;
