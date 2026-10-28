import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import type { JobOption } from "@/context/JobContext";
import { JOB_DETAILS_SELECT } from "@/constants/queries";

export function useAssignedJobs() {
  const { supabase, user, isLoading: isAuthLoading } = useSupabase();

  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignedJobs = useCallback(async () => {
    if (isAuthLoading) return;

    if (!user) {
      setJobs([]);
      setError("You must be signed in to view assigned jobs.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: installer, error: installerError } = await supabase
        .from("installers")
        .select("installer_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (installerError) throw installerError;

      if (!installer) {
        setJobs([]);
        setError("No installer profile is linked to your account.");
        return;
      }

      const { data, error: jobsError } = await supabase
        .from("jobs")
        .select(`${JOB_DETAILS_SELECT}, installation!inner(installer_id)`)
        .eq("installation.installer_id", installer.installer_id)
        .eq("is_active", true)
        .order("job_number", { ascending: true });

      if (jobsError) throw jobsError;

      setJobs((data ?? []) as unknown as JobOption[]);
    } catch (err: unknown) {
      console.error("Failed to load assigned jobs:", err);
      setJobs([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your assigned jobs.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user, isAuthLoading]);

  useEffect(() => {
    void fetchAssignedJobs();
  }, [fetchAssignedJobs]);

  return {
    jobs,
    isLoading: isLoading || isAuthLoading,
    error,
    refetch: fetchAssignedJobs,
  };
}
