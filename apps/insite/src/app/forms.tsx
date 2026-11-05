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
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-center text-base font-semibold text-slate-800">
          No job selected
        </Text>
        <Text className="mt-2 text-center text-sm text-slate-500">
          Return to the dashboard and select a job before opening its forms.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-3"
        >
          <Text className="font-semibold text-white">Back to Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoadingJob || (jobId && selectedJob?.id !== jobId)) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#0f172a" />
        <Text className="mt-3 text-sm text-slate-500">
          Loading active job...
        </Text>
      </View>
    );
  }

  if (!selectedJob) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-center text-base font-semibold text-slate-800">
          Job not available
        </Text>
        <Text className="mt-2 text-center text-sm text-slate-500">
          This job is not available in the current session. Return to the
          dashboard and select it again.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-3"
        >
          <Text className="font-semibold text-white">Back to Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center mb-2">
          <Pressable
            onPress={() => router.back()}
            className="self-start flex-row items-center rounded-lg border border-slate-200 bg-white px-3 py-2"
            accessibilityRole="button"
            accessibilityLabel="Go back to dashboard"
          >
            <Text className="mr-2 text-base font-semibold text-slate-700">
              ←
            </Text>
            <Text className="text-sm font-semibold text-slate-700">Back</Text>
          </Pressable>
          <Text className="text-2xl font-bold text-slate-900 text-center">
            Forms & Details
          </Text>
          <View className="w-12" />
        </View>
        <ActiveJobCard job={selectedJob} relatedJobs={activeJobVariants} />
        <JobFiles selectedJob={selectedJob} category="Procurement" />

        <View className="mb-6">
          <Text className="mb-3 text-md font-bold uppercase tracking-wider text-slate-500">
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
