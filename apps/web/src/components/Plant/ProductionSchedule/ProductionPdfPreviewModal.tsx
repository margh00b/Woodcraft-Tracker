"use client";

import { Modal, Loader, Center } from "@mantine/core";
import dynamic from "next/dynamic";
import { Views } from "@/types/db";
import {
  ProductionSchedulePdf,
  ShippingReportJob,
} from "@/documents/ProductionSchedulePdf";
import { useMemo } from "react";
import { formatProductionScheduleData } from "@/utils/reportFormatters";

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

interface ProductionPdfPreviewModalProps {
  opened: boolean;
  onClose: () => void;
  data: Views<"plant_production_view">[];
  dateRange: [Date | null, Date | null];
}

export default function ProductionPdfPreviewModal({
  opened,
  onClose,
  data,
  dateRange,
}: ProductionPdfPreviewModalProps) {
  const formattedData: ShippingReportJob[] = useMemo(() => {
    return formatProductionScheduleData(data);
  }, [data]);
  const memoizedPreview = useMemo(
    () => (
      <PDFViewer
        key={Math.random()}
        style={{ width: "100%", height: "100%", border: "none" }}
      >
        <ProductionSchedulePdf
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
      title="Production Schedule Preview"
      fullScreen
      styles={{ body: { height: "calc(100vh - 60px)", padding: 0 } }}
    >
      {memoizedPreview}
    </Modal>
  );
}
