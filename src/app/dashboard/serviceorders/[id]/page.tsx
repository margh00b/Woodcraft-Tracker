"use client";

import EditServiceOrder from "@/components/serviceOrders/EditServiceOrder/EditServiceOrder";
import ReadOnlyServiceOrder from "@/components/serviceOrders/ReadOnlyServiceOrder/ReadOnlyServiceOrder";
import { usePermissions } from "@/hooks/usePermissions";
import { useParams } from "next/navigation";

export default function ServiceOrderPage() {
  const params = useParams();
  const serviceOrderId = String(params.id);

  const { canEditServiceOrders } = usePermissions();

  if (!canEditServiceOrders) {
    return <EditServiceOrder serviceOrderId={serviceOrderId} />;
  }

  return <ReadOnlyServiceOrder serviceOrderId={serviceOrderId} />;
}
