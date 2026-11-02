import { useState, useEffect } from "react";
import { useSupabase } from "./useSupabase";
import { useJob, JobOption } from "@/context/JobContext";
import { JOB_DETAILS_SELECT } from "@/constants/queries";
import { useActiveJobSelection } from "@/hooks/useActiveJobSelection";

export function useJobHydration(jobId?: number) {
  const { supabase } = useSupabase();
  const { selectedJob, activeJobVariants } = useJob();
  const { selectActiveJob } = useActiveJobSelection();

  const isAlreadyLoaded =
    !!selectedJob &&
    selectedJob.id === jobId &&
    activeJobVariants.length > 0;
  const [isLoadingJob, setIsLoadingJob] = useState(!isAlreadyLoaded && !!jobId);

  useEffect(() => {
    let isCancelled = false;

    async function loadJob() {
      if (!jobId) {
        setIsLoadingJob(false);
        return;
      }

      if (
        selectedJob?.id === jobId &&
        activeJobVariants.length > 0
      ) {
        setIsLoadingJob(false);
        return;
      }

      setIsLoadingJob(true);
      try {
        let job = selectedJob?.id === jobId ? selectedJob : null;

        if (!job) {
          const { data, error } = await supabase
            .from("jobs")
            .select(JOB_DETAILS_SELECT)
            .eq("id", jobId)
            .single();

          if (error) throw error;
          job = data as JobOption;
        }

        if (!isCancelled && job) {
          await selectActiveJob(job);
        }
      } catch (error) {
        console.error("Failed to hydrate active job:", error);
      } finally {
        if (!isCancelled) {
          setIsLoadingJob(false);
        }
      }
    }

    void loadJob();

    return () => {
      isCancelled = true;
    };
  }, [
    jobId,
    selectedJob?.id,
    activeJobVariants.length,
    supabase,
    selectActiveJob,
  ]);

  return {
    selectedJob,
    isLoadingJob,
  };
}
