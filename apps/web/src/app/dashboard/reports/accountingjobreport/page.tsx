"use client";

import { useEffect } from "react";
import { Center, Loader, Text } from "@mantine/core";
import { useRouter } from "next/navigation";
import AccountingJobReport from "@/components/Reports/AccountingJobReport/AccountingJobReport";
import { usePermissions } from "@/hooks/usePermissions";

export default function AccountingJobReportPage() {
  const router = useRouter();
  const { isLoaded, hasAnyRole } = usePermissions();
  const canViewReport = hasAnyRole(["admin", "reception"]);

  useEffect(() => {
    if (isLoaded && !canViewReport) {
      router.replace("/dashboard/reports");
    }
  }, [isLoaded, canViewReport, router]);

  if (!isLoaded) {
    return (
      <Center h="100%">
        <Loader color="violet" />
      </Center>
    );
  }

  if (!canViewReport) {
    return (
      <Center h="100%">
        <Text c="dimmed">You do not have permission to view this report.</Text>
      </Center>
    );
  }

  return <AccountingJobReport />;
}
