"use client";

import { Modal, Loader, Center } from "@mantine/core";
import dynamic from "next/dynamic";
import { SingleSiteVisitPdf } from "@/documents/SingleSiteVisitPdf";
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

interface SingleSiteVisitPdfModalProps {
  opened: boolean;
  onClose: () => void;
  data: any;
}

export default function SingleSiteVisitPdfModal({
  opened,
  onClose,
  data,
}: SingleSiteVisitPdfModalProps) {
  const content = useMemo(
    () => (
      <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
        <SingleSiteVisitPdf data={data} />
      </PDFViewer>
    ),
    [data]
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Print Site Visit"
      fullScreen
      styles={{ body: { height: "calc(100vh - 60px)", padding: 0 } }}
    >
      {content}
    </Modal>
  );
}
