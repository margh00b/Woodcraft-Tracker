"use client";

import { Modal, Loader, Center, Text } from "@mantine/core";
import dynamic from "next/dynamic";
import { Views } from "@/types/db";
import { PlantShippingSchedulePdf } from "@/documents/PlantShippingSchedulePdf";

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

interface ShippingPdfPreviewModalProps {
  opened: boolean;
  onClose: () => void;
  data: Views<"plant_table_view">[];
  dateRange: [Date | null, Date | null];
}

export default function ShippingPdfPreviewModal({
  opened,
  onClose,
  data,
  dateRange,
}: ShippingPdfPreviewModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Shipping Schedule Preview"
      fullScreen
      styles={{ body: { height: "calc(100vh - 60px)", padding: 0 } }}
    >
      <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
        <PlantShippingSchedulePdf data={data} dateRange={dateRange} />
      </PDFViewer>
    </Modal>
  );
}
