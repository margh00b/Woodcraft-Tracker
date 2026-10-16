import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { useSupabase } from "@/hooks/useSupabase";

export function useColorSearch(selectedId?: string | number | null) {
  const { supabase } = useSupabase();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["color-search", debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from("colors")
        .select("Id, Name")
        .order("Id", { ascending: true })
        .limit(20);

      if (debouncedSearch) {
        query = query.ilike("Name", `%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map((c) => ({ value: String(c.Id), label: c.Name || "" }));
    },
    placeholderData: (previousData: any) => previousData,
  });

  const { data: selectedItem } = useQuery({
    queryKey: ["color-lookup", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const { data } = await supabase
        .from("colors")
        .select("Id, Name")
        .eq("Id", Number(selectedId))
        .single();
      if (!data) return null;
      return { value: String(data.Id), label: data.Name || "" };
    },
    enabled: !!selectedId,
  });

  const options = [...(searchResults || [])];
  if (selectedItem && !options.find((o) => o.value === selectedItem.value)) {
    options.unshift(selectedItem);
  }

  return { options, isLoading, search, setSearch };
}