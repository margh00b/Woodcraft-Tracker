import { useState, useEffect, useRef } from "react";
import { useSupabase } from "./useSupabase";
import { useJob, JobOption } from "@/context/JobContext";
import { JOB_DETAILS_SELECT } from "@/constants/queries";
import { useActiveJobSelection } from "@/hooks/useActiveJobSelection";

export function useJobHydration(jobId?: number) {
  const { supabase } = useSupabase();
  const { selectedJob } = useJob();
  const { selectActiveJob } = useActiveJobSelection();
  const requestedJobId = useRef<number | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(
    !!jobId && selectedJob?.id !== jobId,
  );

  useEffect(() => {
    let isCancelled = false;

    if (!jobId) {
      requestedJobId.current = null;
      setIsLoadingJob(false);
      return;
    }

    // A dashboard selection is already hydrated enough for the Forms screen.
    // Do not fetch/select it again just because the suffix list is still loading.
    if (selectedJob?.id === jobId) {
      requestedJobId.current = null;
      setIsLoadingJob(false);
      return;
    }

    // Avoid starting the same hydration request again on a context rerender.
    if (requestedJobId.current === jobId) return;
    requestedJobId.current = jobId;
    setIsLoadingJob(true);

    async function loadJob() {
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select(JOB_DETAILS_SELECT)
          .eq("id", jobId)
          .single();

        if (error) throw error;
        if (!isCancelled && data) {
          await selectActiveJob(data as JobOption);
        }
      } catch (error) {
        if (!isCancelled) {
          requestedJobId.current = null;
          console.error("Failed to hydrate active job:", error);
        }
      } finally {
        if (!isCancelled) setIsLoadingJob(false);
      }
    }

    void loadJob();

    return () => {
      isCancelled = true;
    };
  }, [jobId, selectedJob?.id, supabase, selectActiveJob]);

  return {
    selectedJob,
    isLoadingJob,
  };
}
