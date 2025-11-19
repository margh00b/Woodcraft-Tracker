"use client";

import Scheduler from "@/components/Production/Scheduler/Scheduler";
import { useParams } from "next/navigation";

export default function EditSalePage() {
  const params = useParams();
  const jobId = Number(params.id);

  return <Scheduler jobId={jobId} />;
}
