"use client";

import EditSale from "@/components/Sales/EditSale/EditSale";
import ReadOnlySale from "@/components/Sales/ReadOnlySale/ReadOnlySale";
import { useParams } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

export default function EditSalePage() {
  const params = useParams();
  const salesOrderId = Number(params.id);

  const { canEditSales } = usePermissions();

  if (canEditSales) {
    return <EditSale salesOrderId={salesOrderId} />;
  }

  return <ReadOnlySale salesOrderId={salesOrderId} />;
}
