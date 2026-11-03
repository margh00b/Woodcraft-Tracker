import { useFormRecord } from "./useFormRecord";

export function useFlhaRecord(flhaId?: string | number) {
  const { data, isLoading, error } = useFormRecord("flha", flhaId);
  return { data: data as any, isLoading, error };
}
