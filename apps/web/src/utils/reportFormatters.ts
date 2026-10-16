import { Views } from "@/types/db";
import { ShippingReportJob as ProductionJob } from "@/documents/ProductionSchedulePdf";
import { ShippingReportJob as ShippingJob } from "@/documents/ShippingReportPdf";
import { WrapScheduleJob } from "@/documents/WrapSchedulePdf";

export const formatWrapScheduleData = (
  data: Views<"plant_wrap_view">[],
): WrapScheduleJob[] => {
  return data.map(
    (item) =>
      ({
        ...item,
        id: item.job_id || item.installation_id || Math.random(),
        is_canopy_required: item.is_canopy_required,
        is_woodtop_required: item.is_woodtop_required,
        is_custom_cab_required: item.is_custom_cab_required,

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
          panel_completed_actual: item.panel_completed_actual,
          custom_finish_completed_actual: item.custom_finish_completed_actual,

          paint_doors_completed_actual: item.paint_doors_completed_actual,
          paint_canopy_completed_actual: item.paint_canopy_completed_actual,
          paint_cust_cab_completed_actual: item.paint_cust_cab_completed_actual,
          assembly_completed_actual: item.assembly_completed_actual,
        },
        installation: {
          wrap_date: item.wrap_date,
          wrap_completed: item.wrap_completed,
        },
      }) as unknown as WrapScheduleJob,
  );
};

export const formatProductionScheduleData = (
  data: Views<"plant_production_view">[],
): ProductionJob[] => {
  return data.map(
    (item) =>
      ({
        ...item,
        id: item.job_id || item.installation_id || Math.random(),
        is_canopy_required: item.is_canopy_required,
        is_woodtop_required: item.is_woodtop_required,
        is_custom_cab_required: item.is_custom_cab_required,

        sales_orders: {
          shipping_client_name: item.client_name,
          shipping_city: item.shipping_city || "",
          shipping_street: item.shipping_street || "",
          shipping_province: item.shipping_province || "",
          order_type: item.order_type,
          cabinet: {
            box: item.cabinet_box || "0",
            interior: item.cabinet_interior || "",
            door_styles: { name: item.cabinet_door_style || "" },
            species: { Species: item.cabinet_species || "" },
            colors: { Name: item.cabinet_color || "" },
          },
        },
        production_schedule: {
          placement_date: item.placement_date,
          ship_schedule: item.ship_schedule || "",
          doors_completed_actual: item.doors_completed_actual,
          panel_completed_actual: item.panel_completed_actual,
          custom_finish_completed_actual: item.custom_finish_completed_actual,

          paint_doors_completed_actual: item.paint_doors_completed_actual,
          paint_canopy_completed_actual: item.paint_canopy_completed_actual,
          paint_cust_cab_completed_actual: item.paint_cust_cab_completed_actual,
          assembly_completed_actual: item.assembly_completed_actual,
        },
        installation: {
          wrap_date: item.wrap_date,
          wrap_completed: item.wrap_completed,
        },
      }) as unknown as ProductionJob,
  );
};

export const formatShipScheduleData = (
  data: Views<"plant_shipping_view">[],
): ShippingJob[] => {
  return data
    .filter((item) => !item.has_shipped)
    .map(
      (item) =>
        ({
          ...item,
          id: item.job_id || item.installation_id || Math.random(),
          sales_orders: {
            shipping_client_name: item.client_name,
            shipping_city: item.shipping_city || "",
            shipping_street: item.shipping_street || "",
            shipping_province: item.shipping_province || "",
            order_type: item.order_type,
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
            ship_status: item.ship_status || "",
          },
          installation: {
            notes: item.installation_notes,
            wrap_completed: item.wrap_completed,
            in_warehouse: item.in_warehouse,
            partially_shipped: item.partially_shipped,
          },
          warehouse_tracking: {
            pickup_date: item.pickup_date,
            dropoff_date: item.dropoff_date,
          },
        }) as unknown as ShippingJob,
    );
};
