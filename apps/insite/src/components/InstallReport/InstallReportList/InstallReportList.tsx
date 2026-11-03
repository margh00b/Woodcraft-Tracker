import React from "react";
import { FormSubmissionsList } from "@/components/Common/FormSubmissionsList/FormSubmissionsList";

interface InstallReportListProps {
  jobId: number;
  onSelectReport?: (reportId: number) => void;
}

export default function InstallReportList({
  jobId,
  onSelectReport,
}: InstallReportListProps) {
  return (
    <FormSubmissionsList
      jobId={jobId}
      formType="install_reports"
      itemLabel="Report"
      onSelectReport={onSelectReport}
    />
  );
}
