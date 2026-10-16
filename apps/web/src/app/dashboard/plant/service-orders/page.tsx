"use client";

import PlantServiceOrdersTable from "@/components/Plant/PlantServiceOrdersTable/PlantServiceOrdersTable";
import { usePermissions } from "@/hooks/usePermissions";
import { Center, Loader, Text } from "@mantine/core";

export default function Page() {
  return <PlantServiceOrdersTable />;
}
