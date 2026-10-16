"use client";

import PurchasingTable from "@/components/Purchasing/PurchasingTable/PurchasingTable";
import ReadOnlyPurchasing from "@/components/Purchasing/ReadOnlyPurchasingTable/ReadOnlyPurchasingTable";
import { usePermissions } from "@/hooks/usePermissions";

export default function PurchasingPage() {
  const { canEditPurchasing } = usePermissions();

  if (canEditPurchasing) {
    return <PurchasingTable />;
  }
  return <ReadOnlyPurchasing />;
}
