"use client";

import OutlookAuthProvider from "./Inbox/OutlookAuth";
import { OutlookInbox } from "./Inbox/OutlookInbox";

export default function OutlookScannerWrapper({ jobId }: { jobId?: number }) {
  return (
    <OutlookAuthProvider>
      <OutlookInbox defaultJobId={jobId} />
    </OutlookAuthProvider>
  );
}
