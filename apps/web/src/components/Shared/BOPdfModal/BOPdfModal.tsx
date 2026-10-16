"use client";

import { BackorderPdf } from "@/documents/BackOrderPdf";
import { Modal, Loader, Center } from "@mantine/core";
import dynamic from "next/dynamic";

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

interface BackorderPdfPreviewModalProps {
  opened: boolean;
  onClose: () => void;
  data: any;
}

export default function BackorderPdfPreviewModal({
  opened,
  onClose,
  data,
}: BackorderPdfPreviewModalProps) {
  if (!data) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Print Backorder BO-${data.id}`}
      fullScreen
      styles={{ body: { height: "calc(100vh - 60px)", padding: 0 } }}
    >
      <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
        <BackorderPdf data={data} />
      </PDFViewer>
    </Modal>
  );
}
