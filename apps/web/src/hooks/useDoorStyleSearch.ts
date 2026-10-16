import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { useSupabase } from "@/hooks/useSupabase";

export function useDoorStyleSearch(selectedId?: string | number | null) {
  const { supabase } = useSupabase();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["door-style-search", debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from("door_styles")
        .select("id, name")
        .order("id", { ascending: true })
        .limit(20);

      if (debouncedSearch) {
        query = query.ilike("name", `%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map((d) => ({ value: String(d.id), label: d.name }));
    },
    placeholderData: (previousData: any) => previousData,
  });

  const { data: selectedItem } = useQuery({
    queryKey: ["door-style-lookup", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const { data } = await supabase
        .from("door_styles")
        .select("id, name")
        .eq("id", Number(selectedId))
        .single();
      if (!data) return null;
      return { value: String(data.id), label: data.name };
    },
    enabled: !!selectedId,
  });

  const options = [...(searchResults || [])];
  if (selectedItem && !options.find((o) => o.value === selectedItem.value)) {
    options.unshift(selectedItem);
  }

  return { options, isLoading, search, setSearch };
}
