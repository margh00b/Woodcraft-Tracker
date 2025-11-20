"use client";

import InstallationEditor from "@/components/Installation/InstallationEditor/InstallationEditor";
import { useParams } from "next/navigation";

export default function InstallationEditorPage() {
  const params = useParams();
  // The 'id' in the route is the Job ID (jobs.id)
  const jobId = Number(params.id);

  return <InstallationEditor jobId={jobId} />;
}
