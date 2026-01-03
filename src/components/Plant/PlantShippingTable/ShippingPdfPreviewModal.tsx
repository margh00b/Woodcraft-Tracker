"use client";

import { Modal, Loader, Center, Text, rem } from "@mantine/core";
import dynamic from "next/dynamic";
import { Views } from "@/types/db";
import {
  ShippingReportPdf,
  ShippingReportJob,
} from "@/documents/ShippingReportPdf";
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
  const formattedData: ShippingReportJob[] = useMemo(() => {
    return data
      .filter((item) => !item.has_shipped)
      .map((item) => ({
        ...item,
        id: item.job_id || item.installation_id || Math.random(),

        sales_orders: {
          shipping_client_name: item.client_name,
          shipping_city: item.shipping_city || "",
          shipping_street: item.shipping_street || "",
          shipping_province: item.shipping_province || "",
          cabinet: {
            box: item.cabinet_box || "0",
            door_styles: { name: item.cabinet_door_style || "" },
            species: { Species: item.cabinet_species || "" },
            colors: { Name: item.cabinet_color || "" },
          },
        },
        production_schedule: {
          placement_date: item.placement_date,
          ship_schedule: item.ship_schedule || "",
          doors_completed_actual: item.doors_completed_actual,
          cut_finish_completed_actual: item.cut_finish_completed_actual,
          custom_finish_completed_actual: item.custom_finish_completed_actual,
          paint_completed_actual: item.paint_completed_actual,
          assembly_completed_actual: item.assembly_completed_actual,
        },

        installation: {},
      } as unknown as ShippingReportJob));
  }, [data]);

  const memoizedPreview = useMemo(
    () => (
      <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
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
