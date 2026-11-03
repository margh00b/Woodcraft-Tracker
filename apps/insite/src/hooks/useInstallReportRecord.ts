import { useFormRecord } from "./useFormRecord";

export function useInstallReportRecord(reportId?: string | number) {
  return useFormRecord("install_reports", reportId);
}
