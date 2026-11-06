import React, { useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ActionPill from "@/components/Common/ActionPill/ActionPill";
import ActiveJobCard from "@/components/Common/ActiveJobCard/ActiveJobCard";
import { useFormDetails } from "@/hooks/useFormDetails";
import { useJob } from "@/context/JobContext";
import JobFiles from "@/components/Common/JobFiles/JobFiles";
import { useJobHydration } from "@/hooks/useJobHydration";
import { useSupabase } from "@/hooks/useSupabase";

export default function FormsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const jobId = params.jobId ? Number(params.jobId) : undefined;
  const { user } = useSupabase();
  const role =
    typeof user?.app_metadata?.role === "string" ? user.app_metadata.role : "";

  const permissions = {
    markouts: ["admin", "markouts"],
    flha: ["admin", "installer"],
    installationReports: ["admin", "installer"],
  };

  const canView = (item: keyof typeof permissions) =>
    permissions[item].includes(role);

  const { selectedJob, activeJobVariants } = useJob();
  const { isLoadingJob } = useJobHydration(jobId);

  const { forms: flhaForms, refetch: refetchFlhaForms } = useFormDetails(
    jobId,
    "flha",
    {
      autoFetch: !!jobId,
    },
  );

  const { forms: installationReports, refetch: refetchInstallationReports } =
    useFormDetails(jobId, "install_reports", {
      autoFetch: !!jobId,
    });
  const { forms: markouts, refetch: refetchMarkouts } = useFormDetails(
    jobId,
    "markouts",
    {
      autoFetch: !!jobId,
    },
  );
  useFocusEffect(
    useCallback(() => {
      if (jobId) {
        void refetchFlhaForms(false);
        void refetchInstallationReports(false);
        void refetchMarkouts(false);
      }
    }, [jobId, refetchFlhaForms, refetchInstallationReports, refetchMarkouts]),
  );

  if (!jobId) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F1F1F7] px-6">
        <Text className="text-center text-base font-semibold text-[#302D4B]">
          No job selected
        </Text>
        <Text className="mt-2 text-center text-sm text-[#85849A]">
          Return to the dashboard and select a job before opening its forms.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-lg bg-[#5141A5] px-4 py-3"
        >
          <Text className="font-semibold text-white">Back to Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoadingJob || (jobId && selectedJob?.id !== jobId)) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F1F1F7]">
        <ActivityIndicator size="large" color="#6654D9" />
        <Text className="mt-3 text-sm text-[#85849A]">
          Loading active job...
        </Text>
      </View>
    );
  }

  if (!selectedJob) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F1F1F7] px-6">
        <Text className="text-center text-base font-semibold text-[#302D4B]">
          Job not available
        </Text>
        <Text className="mt-2 text-center text-sm text-[#85849A]">
          This job is not available in the current session. Return to the
          dashboard and select it again.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-lg bg-[#5141A5] px-4 py-3"
        >
          <Text className="font-semibold text-white">Back to Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F1F1F7]">
      <View pointerEvents="none" className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-violet-300/20" />
      <View pointerEvents="none" className="absolute top-80 -left-24 h-64 w-64 rounded-full bg-purple-200/20" />
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center mb-2">
          <Pressable
            onPress={() => router.back()}
            className="self-start flex-row items-center rounded-lg border border-[#E9E8F1] bg-white px-3 py-2"
            accessibilityRole="button"
            accessibilityLabel="Go back to dashboard"
          >
            <Text className="mr-2 text-base font-semibold text-[#5141A5]">
              ←
            </Text>
            <Text className="text-sm font-semibold text-[#5141A5]">Back</Text>
          </Pressable>
          <Text className="text-xl font-extrabold text-[#5141A5] text-center">
            Forms & Details
          </Text>
          <View className="w-12" />
        </View>
        <ActiveJobCard job={selectedJob} relatedJobs={activeJobVariants} />
        <JobFiles selectedJob={selectedJob} category="Procurement" />

        <View className="mb-6">
          <Text className="mb-3 text-md font-bold uppercase tracking-wider text-[#85849A]">
            Forms
          </Text>
          {canView("markouts") && (
            <ActionPill
              title="Markout"
              badge={markouts.length}
              description={`${markouts.length} report${markouts.length === 1 ? "" : "s"} submitted`}
              icon="✏️"
              onPress={() =>
                router.push({
                  pathname: "/markouts",
                  params: { jobId: String(jobId) },
                })
              }
            />
          )}
          {canView("flha") && (
            <ActionPill
              title="Field Level Hazard Assessment"
              badge={flhaForms.length}
              description={`${flhaForms.length} form${flhaForms.length === 1 ? "" : "s"} submitted`}
              icon="⚠️"
              onPress={() =>
                router.push({
                  pathname: "/flha",
                  params: { jobId: String(jobId) },
                })
              }
            />
          )}
          {canView("installationReports") && (
            <ActionPill
              title="Installation Reports"
              badge={installationReports.length}
              description={`${installationReports.length} report${installationReports.length === 1 ? "" : "s"} submitted`}
              icon="🛠️"
              onPress={() =>
                router.push({
                  pathname: "/install-reports",
                  params: { jobId: String(jobId) },
                })
              }
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
