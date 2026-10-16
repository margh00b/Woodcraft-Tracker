import { useQuery } from "@tanstack/react-query";

import { useSupabase } from "@/hooks/useSupabase";
export function useJobs(isAuthenticated: boolean) {
  const { supabase } = useSupabase();

  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")

        .select("id, job_number")
        .order("job_number", { ascending: false });

      if (error) throw new Error(`Failed to fetch jobs: ${error.message}`);
      return data.map((job) => ({
        value: String(job.id),
        label: job.job_number,
      })) as { value: string; label: string }[];
    },

    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });
}
