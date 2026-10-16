"use client";

import InstallationEditor from "@/components/Installation/InstallationEditor/InstallationEditor";
import { useParams } from "next/navigation";
import ReadOnlyInstallationEditor from "@/components/Installation/ReadOnlyInstallationEditor/ReadOnlyInstallationEditor";
import { usePermissions } from "@/hooks/usePermissions";

export default function InstallationEditorPage() {
  const params = useParams();
  const jobId = Number(params.id);

  const { canEditInstallation } = usePermissions();

  if (canEditInstallation) {
    return <InstallationEditor jobId={jobId} />;
  }

  return <ReadOnlyInstallationEditor jobId={jobId} />;
}
