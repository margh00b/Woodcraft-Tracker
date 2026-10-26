import React from "react";
import { View } from "react-native";
import { Stack, useGlobalSearchParams } from "expo-router";
import { useJob } from "@/context/JobContext";
import { useJobHydration } from "@/hooks/useJobHydration";
import ActiveJobCard from "@/components/Common/ActiveJobCard/ActiveJobCard";

export default function InstallReportLayout() {
  const params = useGlobalSearchParams<{ jobId?: string }>();
  const jobId = params.jobId ? Number(params.jobId) : undefined;
  useJobHydration(isNaN(jobId as number) ? undefined : jobId);
  const { selectedJob } = useJob();

  return (
    <View className="flex-1 bg-slate-50">
      {selectedJob && (
        <View className="px-5 pt-3 pb-1 bg-slate-50">
          <ActiveJobCard job={selectedJob} variant="compact" />
        </View>
      )}
      <View className="flex-1">
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            contentStyle: { backgroundColor: "#f8fafc" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="new" />
          <Stack.Screen name="[id]" />
        </Stack>
      </View>
    </View>
  );
}
