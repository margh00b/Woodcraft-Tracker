import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { useSupabase } from "@/hooks/useSupabase";

export function useClientSearch(selectedId?: string | number | null) {
  const { supabase } = useSupabase();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["client-search", debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from("client")
        .select("id, lastName, street, city, province, zip, phone1, email1, phone2, email2")
        .order("lastName", { ascending: true })
        .limit(20);

      if (debouncedSearch) {
        query = query.ilike("lastName", `%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((c) => ({
        value: String(c.id),
        label: c.lastName,
        original: c, 
      }));
    },
    placeholderData: (previousData: any) => previousData,
  });

  const { data: selectedItem } = useQuery({
    queryKey: ["client-lookup", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const { data, error } = await supabase
        .from("client")
        .select("id, lastName, street, city, province, zip, phone1, email1, phone2, email2")
        .eq("id", Number(selectedId))
        .single();

      if (error || !data) return null;
      return {
        value: String(data.id),
        label: data.lastName,
        original: data,
      };
    },
    enabled: !!selectedId,
    staleTime: 1000 * 60 * 5,
  });

  const options = [...(searchResults || [])];
  if (selectedItem && !options.find((o) => o.value === selectedItem.value)) {
    options.unshift(selectedItem);
  }

  return { options, isLoading: searchLoading, search, setSearch };
}