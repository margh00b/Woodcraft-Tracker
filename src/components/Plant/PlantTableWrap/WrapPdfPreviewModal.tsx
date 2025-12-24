"use client";

import { Modal, Loader, Center } from "@mantine/core";
import dynamic from "next/dynamic";
import { Views } from "@/types/db";
import { PlantWrapSchedulePdf } from "@/documents/PlantWrapSchedulePdf";
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

interface WrapPdfPreviewModalProps {
  opened: boolean;
  onClose: () => void;
  data: Views<"plant_table_view">[];
  dateRange: [Date | null, Date | null];
}

export default function WrapPdfPreviewModal({
  opened,
  onClose,
  data,
  dateRange,
}: WrapPdfPreviewModalProps) {
  const memoizedPreview = useMemo(
    () => (
      <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
        <PlantWrapSchedulePdf data={data} dateRange={dateRange} />
      </PDFViewer>
    ),
    [data, dateRange]
  );
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Wrap Schedule Preview"
      fullScreen
      styles={{ body: { height: "calc(100vh - 60px)", padding: 0 } }}
    >
      {memoizedPreview}
    </Modal>
  );
}
