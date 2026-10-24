import { useState, useCallback, useRef, useEffect } from "react";
import { useSupabase } from "./useSupabase";
import { JobOption } from "@/context/JobContext";
import { JOB_DETAILS_SELECT } from "@/constants/queries";

export type { JobOption };

export interface UseJobSearchOptions {
  limit?: number;
  debounceMs?: number;
  minLength?: number;
}

export interface UseJobSearchReturn {
  searchJobs: (searchTerm: string, limit?: number) => Promise<JobOption[]>;
  isSearching: boolean;
  error: Error | null;
  jobs: JobOption[];
  reset: () => void;
}

export function useJobSearch(
  query?: string,
  options: UseJobSearchOptions = {},
): UseJobSearchReturn {
  const { limit = 10, debounceMs = 300, minLength = 5 } = options;
  const supabase = useSupabase();
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const latestRequestId = useRef(0);

  const reset = useCallback(() => {
    latestRequestId.current += 1;

    setIsSearching((prev) => (prev ? false : prev));
    setError((prev) => (prev !== null ? null : prev));
    setJobs((prev) => (prev.length > 0 ? [] : prev));
  }, []);
  const searchJobs = useCallback(
    async (searchTerm: string, searchLimit = limit): Promise<JobOption[]> => {
      const cleanTerm = searchTerm.trim();
      if (!cleanTerm) {
        setJobs([]);
        return [];
      }

      const requestId = ++latestRequestId.current;
      setIsSearching(true);
      setError(null);

      try {
        const { data, error: queryError } = await supabase
          .from("jobs")
          .select(JOB_DETAILS_SELECT)
          .ilike("job_number", `%${cleanTerm}%`)
          .order("job_number", { ascending: true })
          .limit(searchLimit);

        if (queryError) {
          throw queryError;
        }

        if (requestId !== latestRequestId.current) {
          return [];
        }

        const results = (data as JobOption[]) || [];
        setJobs(results);
        return results;
      } catch (err: any) {
        if (requestId === latestRequestId.current) {
          const fetchError =
            err instanceof Error ? err : new Error(String(err));
          setError(fetchError);
          setJobs([]);
          throw fetchError;
        }
        return [];
      } finally {
        if (requestId === latestRequestId.current) {
          setIsSearching(false);
        }
      }
    },
    [supabase, limit],
  );

  useEffect(() => {
    if (query === undefined) {
      return;
    }

    const cleanInput = query.trim();

    if (cleanInput.length < minLength) {
      if (jobs.length > 0 || isSearching || error !== null) {
        reset();
      }
      return;
    }

    const timer = setTimeout(() => {
      searchJobs(cleanInput).catch(() => {});
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [
    query,
    minLength,
    debounceMs,
    searchJobs,
    reset,
    jobs.length,
    isSearching,
    error,
  ]);

  return {
    searchJobs,
    isSearching,
    error,
    jobs,
    reset,
  };
}
