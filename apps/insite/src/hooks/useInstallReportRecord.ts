// hooks/useInstallReportRecord.ts
import { useState, useEffect } from "react";
import { useSupabase } from "./useSupabase";

export function useInstallReportRecord(reportId?: string | number) {
  const supabase = useSupabase();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!!reportId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!reportId) return;

    let isMounted = true;
    setIsLoading(true);

    async function fetchRecord() {
      try {
        const { data: record, error: fetchError } = await supabase
          .schema("insite")
          .from("install_reports")
          .select("*")
          .eq("id", reportId)
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
  }, [reportId, supabase]);

  return { data, isLoading, error };
}