"use client";

import { TbClipboardCheck } from "react-icons/tb";
import InsiteReportsHeader from "@/components/InsiteReports/InsiteReportsHeader";

export default function InstallationReportsHeader({
  jobId,
}: {
  jobId: number | null;
}) {
  return (
    <InsiteReportsHeader
      title="Installation Reports"
      description="Review installation reports submitted through Insite."
      icon={<TbClipboardCheck size={27} />}
      jobId={jobId}
      allReportsHref="/dashboard/install-reports"
    />
  );
}
