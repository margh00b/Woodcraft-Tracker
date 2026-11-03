"use client";

import { Center, Loader, Modal } from "@mantine/core";
import dynamic from "next/dynamic";
import type { ReactElement } from "react";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <Center h="100%">
        <Loader color="violet" />
      </Center>
    ),
  },
);

type InsiteReportPdfModalProps = {
  opened: boolean;
  onClose: () => void;
  title: string;
  children: ReactElement;
};

export default function InsiteReportPdfModal({
  opened,
  onClose,
  title,
  children,
}: InsiteReportPdfModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      fullScreen
      padding={0}
      styles={{
        header: {
          padding: "12px 20px",
          borderBottom: "1px solid var(--mantine-color-gray-3)",
        },
        body: {
          height: "calc(100dvh - 60px)",
          padding: 0,
        },
        content: {
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <PDFViewer
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
      >
        {children}
      </PDFViewer>
    </Modal>
  );
}
