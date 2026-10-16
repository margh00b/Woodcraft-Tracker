"use client";

import { Modal, Loader, Center, Text, rem } from "@mantine/core";
import dynamic from "next/dynamic";
import { Views } from "@/types/db";
import {
  ShippingReportPdf,
  ShippingReportJob,
} from "@/documents/ShippingReportPdf";
import { useMemo } from "react";
import { formatShipScheduleData } from "@/utils/reportFormatters";

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
  data: Views<"plant_shipping_view">[];
  dateRange: [Date | null, Date | null];
}

export default function ShippingPdfPreviewModal({
  opened,
  onClose,
  data,
  dateRange,
}: ShippingPdfPreviewModalProps) {
  const formattedData: ShippingReportJob[] = useMemo(() => {
    return formatShipScheduleData(data);
  }, [data]);

  const memoizedPreview = useMemo(
    () => (
      <PDFViewer
        key={Math.random()}
        style={{ width: "100%", height: "100%", border: "none" }}
      >
        <ShippingReportPdf
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
      title="Shipping Schedule Preview"
      fullScreen
      styles={{ body: { height: "calc(100vh - 60px)", padding: 0 } }}
    >
      {memoizedPreview}
    </Modal>
  );
}
