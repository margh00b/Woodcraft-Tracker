import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { useSupabase } from "@/hooks/useSupabase";

export function useSpeciesSearch(selectedId?: string | number | null) {
  const { supabase } = useSupabase();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["species-search", debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from("species")
        .select("Id, Species")
        .order("Id", { ascending: true })
        .limit(20);

      if (debouncedSearch) {
        query = query.ilike("Species", `%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map((s) => ({ value: String(s.Id), label: s.Species }));
    },
    placeholderData: (previousData: any) => previousData,
  });

  const { data: selectedItem } = useQuery({
    queryKey: ["species-lookup", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const { data } = await supabase
        .from("species")
        .select("Id, Species")
        .eq("Id", Number(selectedId))
        .single();
      if (!data) return null;
      return { value: String(data.Id), label: data.Species };
    },
    enabled: !!selectedId,
  });

  const options = [...(searchResults || [])];
  if (selectedItem && !options.find((o) => o.value === selectedItem.value)) {
    options.unshift(selectedItem);
  }

  return { options, isLoading, search, setSearch };
}