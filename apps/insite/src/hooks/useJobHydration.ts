// hooks/useJobHydration.ts
import { useState, useEffect } from "react";
import { useSupabase } from "./useSupabase";
import { useJob, JobOption } from "@/context/JobContext";

export function useJobHydration(jobId?: string | number) {
  const supabase = useSupabase();
  const { selectedJob, setSelectedJob } = useJob();
  
  // If we already have a selected job in context, we aren't loading. 
  // Otherwise, if a jobId param exists, we are loading.
  const [isLoadingJob, setIsLoadingJob] = useState(!selectedJob && !!jobId);

  useEffect(() => {
    let isCancelled = false;

    async function loadJob() {
      // If we already have a job selected or no jobId was provided, skip fetching
      if (selectedJob || !jobId) {
        setIsLoadingJob(false);
        return;
      }

      setIsLoadingJob(true);
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select(
            `
            id, 
            job_number,
            sales_orders (
              shipping_client_name,
              shipping_street,
              shipping_city
            )
          `,
          )
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
  }, [jobId, selectedJob, supabase, setSelectedJob]);

  return {
    selectedJob,
    isLoadingJob,
  };
}