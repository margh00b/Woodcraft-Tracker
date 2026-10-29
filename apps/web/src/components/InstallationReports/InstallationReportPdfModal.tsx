"use client";

import { Center, Loader, Modal } from "@mantine/core";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { InstallationReport } from "@/hooks/useInstallationReports";
import { InstallationReportPdf } from "@/documents/InstallationReportPdf";

type ReportPhoto = {
  id: number | string;
  file_name: string;
  file_type?: string | null;
  file_tag?: string | null;
  signedUrl: string;
};

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

type PdfModalProps = {
  opened: boolean;
  onClose: () => void;
  report: InstallationReport | null;
  photos: ReportPhoto[];
};

export default function InstallationReportPdfModal({
  opened,
  onClose,
  report,
  photos,
}: PdfModalProps) {
  const content = useMemo(() => {
    if (!report) return null;

    return (
      <PDFViewer
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
      >
        <InstallationReportPdf report={report} photos={photos} />
      </PDFViewer>
    );
  }, [report, photos]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Installation Report PDF"
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
      {content}
    </Modal>
  );
}
