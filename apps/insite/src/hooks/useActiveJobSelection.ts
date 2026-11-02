import { useCallback, useRef } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { JobOption, useJob } from "@/context/JobContext";
import { JOB_DETAILS_SELECT } from "@/constants/queries";

/**
 * Selects the active job and loads every database job sharing its base number.
 * Search results and assigned jobs are entry points only; neither is treated as
 * the canonical source for the job's suffix family.
 */
export function useActiveJobSelection() {
  const { supabase } = useSupabase();
  const { setSelectedJob, setActiveJobVariants } = useJob();
  const requestId = useRef(0);

  const selectActiveJob = useCallback(
    async (job: JobOption) => {
      const currentRequest = ++requestId.current;
      const baseJobNumber = job.job_number.split("-")[0];

      // Update immediately so navigation never points at a stale active job.
      setSelectedJob(job);
      setActiveJobVariants([job]);

      try {
        const { data, error } = await supabase
          .from("jobs")
          .select(JOB_DETAILS_SELECT)
          .or(
            `job_number.eq.${baseJobNumber},job_number.like.${baseJobNumber}-%`,
          )
          .order("job_number", { ascending: true });

        if (error) throw error;
        if (currentRequest !== requestId.current) return;

        const variantsById = new Map<number, JobOption>();
        for (const variant of (data ?? []) as JobOption[]) {
          variantsById.set(variant.id, variant);
        }
        // Preserve the selected record even if it was excluded by RLS or query filters.
        variantsById.set(job.id, job);
        setActiveJobVariants(Array.from(variantsById.values()));
      } catch (error) {
        // The selected job remains usable if family lookup fails.
        console.error("Failed to load related job suffixes:", error);
      }
    },
    [setSelectedJob, setActiveJobVariants, supabase],
  );

  return { selectActiveJob };
}
