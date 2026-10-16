import { Views, Tables, TablesInsert } from "@/types/db";

export type PurchasingTableView = Views<"purchasing_table_view"> & {
  doors_received_incomplete_at: string | null;
  glass_received_incomplete_at: string | null;
  handles_received_incomplete_at: string | null;
  acc_received_incomplete_at: string | null;
};

export type PurchaseOrderItemRow = Tables<"purchase_order_items"> & {
  po_number?: string | null;
  qty_received?: number | null;
};

export type PurchaseOrderItemState =
  | PurchaseOrderItemRow
  | (TablesInsert<"purchase_order_items"> & {
      id?: number;
      po_number?: string | null;
      qty_received?: number | null;
    });
