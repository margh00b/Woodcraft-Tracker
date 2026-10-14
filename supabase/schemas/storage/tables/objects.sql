CREATE POLICY "Authenticated users can delete job_files" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING ((bucket_id = 'job_files'::text));

CREATE POLICY "Authenticated users can select job_files" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING ((bucket_id = 'job_files'::text));

CREATE POLICY "Authenticated users can update job_files" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING ((bucket_id = 'job_files'::text));

CREATE POLICY "Authenticated users can upload job_files" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((bucket_id = 'job_files'::text));
