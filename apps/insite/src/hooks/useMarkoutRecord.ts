import { useFormRecord } from "./useFormRecord";
import type { MarkoutRecord } from "@/types/markout";

export function useMarkoutRecord(reportId?: string | number) {
  const { data, isLoading, error } = useFormRecord("markouts", reportId);
  return {
    data: data as MarkoutRecord | null,
    isLoading,
    error,
  };
}
