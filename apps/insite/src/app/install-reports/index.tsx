import React, { useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import ActiveJobCard from "@/components/Common/ActiveJobCard/ActiveJobCard";
import InstallReportList from "@/components/InstallReport/InstallReportList/InstallReportList";
import { useJobHydration } from "@/hooks/useJobHydration";
import { useFormDetails } from "@/hooks/useFormDetails";
import { useJob } from "@/context/JobContext";

export default function InstallReportScreen() {
  const router = useRouter();
  const { selectedJob } = useJob();

  const { refetch } = useFormDetails(selectedJob?.id, "install_reports", {
    autoFetch: false,
  });

  useFocusEffect(
    useCallback(() => {
      if (selectedJob?.id) {
        refetch(false);
      }
    }, [selectedJob?.id, refetch]),
  );

  const handleCreateNew = () => {
    if (!selectedJob) return;
    router.push({
      pathname: "/install-reports/new",
      params: { jobId: String(selectedJob.id) },
    });
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-200">
        <Pressable
          className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200"
          onPress={() => router.back()}
        >
          <Text className="text-slate-700 font-medium text-md">← Back</Text>
        </Pressable>
        <Text className="text-lg font-bold text-slate-900">
          Installation Reports
        </Text>
        <View className="w-12" />
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {!selectedJob && (
          <View className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-5 shadow-sm">
            <Text className="text-sm font-bold text-amber-800 mb-1">
              No Job Selected
            </Text>
            <Text className="text-sm text-amber-700 mb-3">
              Please select a job from the dashboard to view or create reports.
            </Text>
            <Pressable
              className="bg-amber-600 py-2 px-3 rounded-lg self-start"
              onPress={() => router.back()}
            >
              <Text className="text-sm font-semibold text-white">
                ← Return to Dashboard
              </Text>
            </Pressable>
          </View>
        )}

        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-md font-bold text-slate-500 uppercase tracking-wider">
            Past Submissions
          </Text>
          {selectedJob && (
            <Pressable
              onPress={handleCreateNew}
              className="bg-slate-900 px-3.5 py-2 rounded-lg shadow-sm active:opacity-80"
            >
              <Text className="text-white text-sm font-bold">+ New Report</Text>
            </Pressable>
          )}
        </View>

        {selectedJob && (
          <InstallReportList
            jobId={selectedJob.id}
            onSelectReport={(reportId) =>
              router.push(`/install-reports/${reportId}`)
            }
          />
        )}
      </ScrollView>
    </View>
  );
}
