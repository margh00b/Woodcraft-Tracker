import { useState, useEffect } from "react";
import { useSupabase } from "./useSupabase";

export function useFlhaRecord(flhaId?: string | number) {
  const supabase = useSupabase();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!!flhaId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!flhaId) return;

    let isMounted = true;
    setIsLoading(true);

    async function fetchRecord() {
      try {
        const { data: record, error: fetchError } = await supabase
          .schema("insite")
          .from("flha")
          .select("*")
          .eq("id", flhaId)
          .single();

        if (fetchError) throw fetchError;

        if (isMounted) {
          setData(record);
        }
      } catch (err: any) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchRecord();

    return () => {
      isMounted = false;
    };
  }, [flhaId, supabase]);

  return { data, isLoading, error };
}
