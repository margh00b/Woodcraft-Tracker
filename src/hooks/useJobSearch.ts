import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { useSupabase } from "@/hooks/useSupabase";

export function useJobSearch(selectedId?: string | null) {
  const { supabase } = useSupabase();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["job-search", debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from("jobs")
        .select("id, job_number")
        .order("job_number", { ascending: false })
        .limit(10);

      if (debouncedSearch) {
        query = query.ilike("job_number", `%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((j) => ({ value: String(j.id), label: j.job_number }));
    },
    placeholderData: (previousData: any) => previousData,
  });

  const { data: selectedItem } = useQuery({
    queryKey: ["job-lookup", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;

      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_number")
        .eq("id", Number(selectedId))
        .single();

      if (error || !data) return null;
      return { value: String(data.id), label: data.job_number };
    },
    enabled: !!selectedId,
    staleTime: 1000 * 60 * 5,
  });

  const options = [...(searchResults || [])];

  if (selectedItem && !options.find((o) => o.value === selectedItem.value)) {
    options.unshift(selectedItem);
  }

  return {
    options,
    isLoading: searchLoading,
    search,
    setSearch,
  };
}
