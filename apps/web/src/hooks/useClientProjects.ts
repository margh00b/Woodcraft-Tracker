import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "./useSupabase";

export const useClientProjects = (clientId: number | null) => {
  const { supabase } = useSupabase();

  return useQuery({
    queryKey: ["client-projects", clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase.rpc("get_client_project_names", {
        input_client_id: clientId,
      });

      if (error) {
        console.error("Error fetching client projects:", error);
        return [];
      }

      return data.map((item: { project_name: any }) => item.project_name);
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5,
  });
};
