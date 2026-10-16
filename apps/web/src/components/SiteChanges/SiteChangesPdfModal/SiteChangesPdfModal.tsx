"use client";

import { Modal, Loader, Center } from "@mantine/core";
import dynamic from "next/dynamic";
import { SiteChangesPdf } from "@/documents/SiteChangesPdf";
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

interface SiteChangesPdfModalProps {
  opened: boolean;
  onClose: () => void;
  data: any[];
  dateRange: [Date | null, Date | null];
}

export default function SiteChangesPdfModal({
  opened,
  onClose,
  data,
  dateRange,
}: SiteChangesPdfModalProps) {
  const content = useMemo(
    () => (
      <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
        <SiteChangesPdf data={data} dateRange={dateRange} />
      </PDFViewer>
    ),
    [data, dateRange]
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Site Changes Report"
      fullScreen
      styles={{ body: { height: "calc(100vh - 60px)", padding: 0 } }}
    >
      {content}
    </Modal>
  );
}
