"use client";

import { Modal, Loader, Center } from "@mantine/core";
import dynamic from "next/dynamic";
import { SiteVisitsPdf } from "@/documents/SiteVisitsPdf";
import { useMemo } from "react";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <Center h={400}>
        <Loader color="violet" />
      </Center>
    ),
  }
);

interface SiteVisitsPdfModalProps {
  opened: boolean;
  onClose: () => void;
  data: any[];
  dateRange: [Date | null, Date | null];
}

export default function SiteVisitsPdfModal({
  opened,
  onClose,
  data,
  dateRange,
}: SiteVisitsPdfModalProps) {
  const content = useMemo(
    () => (
      <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
        <SiteVisitsPdf data={data} dateRange={dateRange} />
      </PDFViewer>
    ),
    [data, dateRange]
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Site Visits Report"
      fullScreen
      styles={{ body: { height: "calc(100vh - 60px)", padding: 0 } }}
    >
      {content}
    </Modal>
  );
}
