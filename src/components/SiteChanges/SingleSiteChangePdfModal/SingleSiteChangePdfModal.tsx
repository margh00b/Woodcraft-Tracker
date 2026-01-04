"use client";

import { Modal, Loader, Center } from "@mantine/core";
import dynamic from "next/dynamic";
import { SingleSiteChangePdf } from "@/documents/SingleSiteChangePdf";
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

interface SingleSiteChangePdfModalProps {
  opened: boolean;
  onClose: () => void;
  data: any;
}

export default function SingleSiteChangePdfModal({
  opened,
  onClose,
  data,
}: SingleSiteChangePdfModalProps) {
  const content = useMemo(
    () => (
      <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
        <SingleSiteChangePdf data={data} />
      </PDFViewer>
    ),
    [data]
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Print Site Change"
      fullScreen
      styles={{ body: { height: "calc(100vh - 60px)", padding: 0 } }}
    >
      {content}
    </Modal>
  );
}
