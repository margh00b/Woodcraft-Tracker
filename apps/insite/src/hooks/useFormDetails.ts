// hooks/useFormDetails.ts
import { useState, useCallback, useRef, useEffect } from "react";
import { useSupabase } from "./useSupabase";

export type FormType =
  | "flha"
  | "equipment_log"
  | "timecard"
  | "incident_report";

export interface FormSubmissionMeta {
  id: number;
  job_id: number;
  submitted_by: string;
  created_at: string;
  updated_at: string;
  form_type: FormType;
}

export interface UseFormDetailsOptions {
  limit?: number;
  autoFetch?: boolean;
}

export function useFormDetails(
  jobId?: number,
  formType: FormType = "flha",
  options: UseFormDetailsOptions = {},
) {
  const limit = options.limit ?? 20;
  const autoFetch = options.autoFetch ?? true;

  const supabase = useSupabase();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [forms, setForms] = useState<FormSubmissionMeta[]>([]);

  const latestRequestId = useRef(0);
  const fetchRef = useRef<
    ((id: number, type?: FormType) => Promise<FormSubmissionMeta[]>) | null
  >(null);

  const reset = useCallback(() => {
    latestRequestId.current += 1;
    setIsLoading(false);
    setError(null);
    setForms([]);
  }, []);

  const fetchFormDetails = useCallback(
    async (
      targetJobId: number,
      targetFormType: FormType = formType,
    ): Promise<FormSubmissionMeta[]> => {
      if (!targetJobId) {
        setForms([]);
        return [];
      }

      const requestId = ++latestRequestId.current;
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: queryError } = await supabase
          .schema("insite")
          .from(targetFormType)
          .select("id, job_id, submitted_by, created_at, updated_at")
          .eq("job_id", targetJobId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (queryError) throw queryError;

        if (requestId !== latestRequestId.current) return [];

        const formattedResults: FormSubmissionMeta[] = (data || []).map(
          (row) => ({
            id: row.id,
            job_id: row.job_id,
            submitted_by: row.submitted_by || "Unknown",
            created_at: row.created_at,
            updated_at: row.updated_at || row.created_at,
            form_type: targetFormType,
          }),
        );

        setForms(formattedResults);
        return formattedResults;
      } catch (err: any) {
        if (requestId === latestRequestId.current) {
          const fetchError =
            err instanceof Error ? err : new Error(String(err));
          setError(fetchError);
          setForms([]);
          throw fetchError;
        }
        return [];
      } finally {
        if (requestId === latestRequestId.current) {
          setIsLoading(false);
        }
      }
    },
    [supabase, formType, limit],
  );

  fetchRef.current = fetchFormDetails;

  const refetch = useCallback(() => {
    if (jobId) {
      return fetchRef.current?.(jobId, formType) ?? Promise.resolve([]);
    }
    return Promise.resolve([]);
  }, [jobId, formType]);

  useEffect(() => {
    if (!autoFetch || !jobId) return;

    fetchRef.current?.(jobId)?.catch(() => {});
  }, [jobId, autoFetch]);

  return {
    forms,
    isLoading,
    error,
    fetchFormDetails,
    refetch,
    reset,
  };
}
