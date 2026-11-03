import { useState, useEffect } from "react";
import { useSupabase } from "./useSupabase";
import type { FormType } from "./useFormDetails";

export interface FormRecordBase<T = Record<string, any>> {
  id: number;
  job_id: number;
  details: T;
  submitted_by?: string;
  created_at: string;
  updated_at?: string;
  idempotency_key?: string;
}

export function useFormRecord<T = Record<string, any>>(
  formType: FormType,
  recordId?: string | number,
) {
  const { supabase } = useSupabase();
  const [data, setData] = useState<FormRecordBase<T> | null>(null);
  const [isLoading, setIsLoading] = useState(!!recordId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!recordId) return;

    let isMounted = true;
    setIsLoading(true);

    async function fetchRecord() {
      try {
        const { data: record, error: fetchError } = await supabase
          .schema("insite")
          .from(formType)
          .select("*")
          .eq("id", recordId)
          .single();

        if (fetchError) throw fetchError;

        if (isMounted) {
          setData(record as FormRecordBase<T>);
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
  }, [formType, recordId, supabase]);

  return { data, isLoading, error };
}
