// app/install-report/[id].tsx
import React from "react";
import { useLocalSearchParams } from "expo-router";
import EditInstallReport from "@/components/InstallReport/EditInstallReport/EditInstallReport";
import { View, Text } from "react-native";
export default function InstallReportEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id)
    return (
      <View className="flex-1 bg-slate-50">
        <Text>
          Something went wrong! Contact your Software Admin for assistance.
        </Text>
      </View>
    );

  return <EditInstallReport reportId={id} />;
}
