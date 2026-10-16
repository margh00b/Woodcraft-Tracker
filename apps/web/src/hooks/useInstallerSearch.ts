import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { useSupabase } from "@/hooks/useSupabase";

export function useInstallerSearch(selectedId?: string | null) {
  const { supabase } = useSupabase();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const formatLabel = (i: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
  }) => {
    const namePart = `${i.first_name || ""} ${i.last_name || ""}`.trim();
    const companyPart = i.company_name || "";
    return [namePart, companyPart].filter(Boolean).join(" - ");
  };

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["installer-search", debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from("installers")
        .select("installer_id, first_name, last_name, company_name")
        .eq("is_active", true)
        .order("company_name", { ascending: true, nullsFirst: false })
        .limit(50);

      if (debouncedSearch) {
        const term = `%${debouncedSearch}%`;
        query = query.or(
          `first_name.ilike.${term},last_name.ilike.${term},company_name.ilike.${term}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((i) => ({
        value: String(i.installer_id),
        label: formatLabel(i),
      }));
    },
    placeholderData: (previousData: any) => previousData,
  });

  const { data: selectedItem } = useQuery({
    queryKey: ["installer-lookup", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;

      const { data, error } = await supabase
        .from("installers")
        .select("installer_id, first_name, last_name, company_name")
        .eq("installer_id", Number(selectedId))
        .single();

      if (error || !data) return null;
      return {
        value: String(data.installer_id),
        label: formatLabel(data),
      };
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
