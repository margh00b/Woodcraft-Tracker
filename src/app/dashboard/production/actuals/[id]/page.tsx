"use client";

import ProductionActuals from "@/components/Production/ProductionActuals/ProductionActuals";
import { use } from "react";

export default function ProductionActualsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  console.log(id);
  return <ProductionActuals jobId={Number(id)} />;
}
