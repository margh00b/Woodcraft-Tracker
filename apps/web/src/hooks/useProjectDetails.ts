import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "./useSupabase";

export const useProjectDetails = (
  clientId: number | null,
  projectName: string | null
) => {
  const { supabase } = useSupabase();

  return useQuery({
    queryKey: ["project-details-lookup", clientId, projectName],
    queryFn: async () => {
      if (!clientId || !projectName) return null;

      const { data, error } = await supabase
        .from("sales_orders")
        .select(
          `
          shipping_client_name, 
          shipping_street, 
          shipping_city, 
          shipping_province, 
          shipping_zip, 
          shipping_phone_1, 
          shipping_phone_2, 
          shipping_email_1, 
          shipping_email_2,
          jobs (
            job_number
          )
        `
        )
        .eq("client_id", clientId)
        .eq("project_name", projectName)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching project details:", error);
        return null;
      }
      console.log(data);
      return data;
    },
    enabled: !!clientId && !!projectName && projectName.trim().length > 0,
    staleTime: 1000 * 60 * 5,
  });
};
