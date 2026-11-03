import React from "react";
import { FormSubmissionsList } from "@/components/Common/FormSubmissionsList/FormSubmissionsList";

interface MarkoutsListProps {
  jobId: number;
  onSelectReport?: (reportId: number) => void;
}

export default function MarkoutsList({
  jobId,
  onSelectReport,
}: MarkoutsListProps) {
  return (
    <FormSubmissionsList
      jobId={jobId}
      formType="markouts"
      itemLabel="Markout"
      onSelectReport={onSelectReport}
    />
  );
}
