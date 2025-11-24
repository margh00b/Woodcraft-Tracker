"use client";

import dynamic from "next/dynamic";
import { Loader, Center, Text } from "@mantine/core";
import { ServiceOrderPdf } from "@/documents/ServiceOrderPdf";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <Center h={400} bg="gray.0">
        <Loader size="lg" />
        <Text ml="md">Loading PDF Viewer...</Text>
      </Center>
    ),
  }
);

interface PdfPreviewProps {
  data: any;
}

export default function PdfPreview({ data }: PdfPreviewProps) {
  if (!data) return null;

  return (
    <PDFViewer style={{ width: "100%", height: "80vh", border: "none" }}>
      <ServiceOrderPdf data={data} />
    </PDFViewer>
  );
}
