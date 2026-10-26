import { useState, useCallback, useRef, useEffect } from "react";
import { useSupabase } from "./useSupabase";

export type FormType = "flha" | "install_reports";

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
  staleTime?: number;
}

const formCache = new Map<
  string,
  { data: FormSubmissionMeta[]; timestamp: number }
>();

export function invalidateFormDetailsCache(
  jobId?: number,
  formType: FormType = "flha",
) {
  if (jobId) {
    formCache.delete(`${formType}_${jobId}`);
  } else {
    formCache.clear();
  }
}

export function useFormDetails(
  jobId?: number,
  formType: FormType = "flha",
  options: UseFormDetailsOptions = {},
) {
  const limit = options.limit ?? 20;
  const autoFetch = options.autoFetch ?? true;
  const staleTime = options.staleTime ?? 60000;

  const supabase = useSupabase();

  const cacheKey = jobId ? `${formType}_${jobId}` : "";
  const initialCached = cacheKey ? formCache.get(cacheKey) : undefined;

  const [isLoading, setIsLoading] = useState(!initialCached && !!jobId);
  const [error, setError] = useState<Error | null>(null);
  const [forms, setForms] = useState<FormSubmissionMeta[]>(
    initialCached?.data || [],
  );

  const latestRequestId = useRef(0);
  const fetchRef =
    useRef<
      (
        id: number,
        type?: FormType,
        force?: boolean,
      ) => Promise<FormSubmissionMeta[]>
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
      force = false,
    ): Promise<FormSubmissionMeta[]> => {
      if (!targetJobId) {
        setForms([]);
        return [];
      }

      const key = `${targetFormType}_${targetJobId}`;
      const cached = formCache.get(key);
      const isFresh = cached && Date.now() - cached.timestamp < staleTime;

      if (!force && isFresh) {
        setForms(cached.data);
        setIsLoading(false);
        return cached.data;
      }

      const requestId = ++latestRequestId.current;
      if (!cached || cached.data.length === 0) {
        setIsLoading(true);
      }
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

        formCache.set(key, { data: formattedResults, timestamp: Date.now() });
        setForms(formattedResults);
        return formattedResults;
      } catch (err: any) {
        if (requestId === latestRequestId.current) {
          const fetchError =
            err instanceof Error ? err : new Error(String(err));
          setError(fetchError);
          if (!cached) {
            setForms([]);
          }
          throw fetchError;
        }
        return [];
      } finally {
        if (requestId === latestRequestId.current) {
          setIsLoading(false);
        }
      }
    },
    [supabase, formType, limit, staleTime],
  );

  fetchRef.current = fetchFormDetails;

  const refetch = useCallback(
    (force = false) => {
      if (jobId) {
        return (
          fetchRef.current?.(jobId, formType, force) ?? Promise.resolve([])
        );
      }
      return Promise.resolve([]);
    },
    [jobId, formType],
  );

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
