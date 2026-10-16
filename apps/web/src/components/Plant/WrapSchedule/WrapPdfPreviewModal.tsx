"use client";

import { Modal, Loader, Center } from "@mantine/core";
import dynamic from "next/dynamic";
import { Views } from "@/types/db";
import { WrapSchedulePdf, WrapScheduleJob } from "@/documents/WrapSchedulePdf";
import { useMemo } from "react";
import { formatWrapScheduleData } from "@/utils/reportFormatters";

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
  data: Views<"plant_wrap_view">[];
  dateRange: [Date | null, Date | null];
}

export default function WrapPdfPreviewModal({
  opened,
  onClose,
  data,
  dateRange,
}: WrapPdfPreviewModalProps) {
  const formattedData: WrapScheduleJob[] = useMemo(() => {
    return formatWrapScheduleData(data);
  }, [data]);
  const memoizedPreview = useMemo(
    () => (
      <PDFViewer
        key={Math.random()}
        style={{ width: "100%", height: "100%", border: "none" }}
      >
        <WrapSchedulePdf
          data={formattedData}
          startDate={dateRange[0]}
          endDate={dateRange[1]}
        />
      </PDFViewer>
    ),
    [formattedData, dateRange]
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
