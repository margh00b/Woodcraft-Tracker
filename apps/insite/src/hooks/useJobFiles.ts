import { useState, useEffect, useCallback } from "react";
import { JobOption } from "@/context/JobContext";
import { useSupabase } from "./useSupabase";

export interface JobAttachment {
  id: string | number;
  job_id: number;
  file_name: string;
  file_path: string;
  file_url?: string;
  category?: string;
  created_at?: string;
  [key: string]: any;
}

export function useJobFiles(
  selectedJob: JobOption | null,
  category?: string | null,
  bucketName: string = "job_files",
) {
  const { supabase } = useSupabase();
  const [files, setFiles] = useState<JobAttachment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobFiles = useCallback(async () => {
    if (!selectedJob?.id) {
      setFiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let targetJobIds: number[] = [selectedJob.id];

      if (selectedJob.job_number) {
        const baseJobNumber = selectedJob.job_number.split("-")[0].trim();

        if (baseJobNumber) {
          const { data: variants, error: variantError } = await supabase
            .from("jobs")
            .select("id")
            .ilike("job_number", `${baseJobNumber}%`);

          if (!variantError && variants && variants.length > 0) {
            targetJobIds = variants.map((v) => v.id);
          }
        }
      }

      let query = supabase
        .from("job_attachments")
        .select("*")
        .in("job_id", targetJobIds);

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error: fetchError } = await query.order("created_at", {
        ascending: false,
      });

      if (fetchError) {
        throw fetchError;
      }

      const formattedFiles: JobAttachment[] = (data || []).map((file) => {
        let publicUrl = file.file_url;

        if (!publicUrl || !publicUrl.startsWith("http")) {
          const path = file.file_path || file.file_url;
          if (path) {
            const { data: storageData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(path);

            publicUrl = storageData?.publicUrl;
          }
        }

        return {
          ...file,
          file_url: publicUrl,
        };
      });

      setFiles(formattedFiles);
    } catch (err: any) {
      console.error("Error fetching job attachments:", err);
      setError(err?.message || "Failed to load job attachments");
    } finally {
      setLoading(false);
    }
  }, [
    selectedJob?.id,
    selectedJob?.job_number,
    category,
    bucketName,
    supabase,
  ]);

  useEffect(() => {
    fetchJobFiles();
  }, [fetchJobFiles]);

  return {
    files,
    loading,
    error,
    refetch: fetchJobFiles,
  };
}
