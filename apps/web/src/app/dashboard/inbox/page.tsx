"use client";

import OutlookScannerWrapper from "@/components/Outlook/OutlookScanner";
import { useParams } from "next/navigation";

export default function InstallationEditorPage() {
  const params = useParams();
  const jobId = Number(params.id);

  return <OutlookScannerWrapper jobId={jobId} />;
}
