"use client";

import ReadOnlyScheduler from "@/components/Production/ReadOnlyScheduler/ReadOnlyScheduler";
import Scheduler from "@/components/Production/Scheduler/Scheduler";
import { useParams } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

export default function EditSchedulerPage() {
  const params = useParams();
  const jobId = Number(params.id);

  const { canEditProduction } = usePermissions();

  if (canEditProduction) {
    return <Scheduler jobId={jobId} />;
  }

  return <ReadOnlyScheduler jobId={jobId} />;
}
