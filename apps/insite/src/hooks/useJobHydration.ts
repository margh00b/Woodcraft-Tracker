import { useState, useEffect } from "react";
import { useSupabase } from "./useSupabase";
import { useJob, JobOption } from "@/context/JobContext";
import { JOB_DETAILS_SELECT } from "@/constants/queries";

export function useJobHydration(jobId?: number) {
  const supabase = useSupabase();
  const { selectedJob, setSelectedJob } = useJob();

  const isAlreadyLoaded = !!selectedJob && selectedJob.id === jobId;
  const [isLoadingJob, setIsLoadingJob] = useState(!isAlreadyLoaded && !!jobId);

  useEffect(() => {
    let isCancelled = false;

    async function loadJob() {
      if (!jobId || (selectedJob && selectedJob.id === jobId)) {
        setIsLoadingJob(false);
        return;
      }

      setIsLoadingJob(true);
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select(JOB_DETAILS_SELECT)
          .eq("id", jobId)
          .single();

        if (!isCancelled && !error && data) {
          setSelectedJob(data as JobOption);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingJob(false);
        }
      }
    }

    loadJob();

    return () => {
      isCancelled = true;
    };
  }, [jobId, selectedJob?.id, supabase, setSelectedJob]);

  return {
    selectedJob,
    isLoadingJob,
  };
}
