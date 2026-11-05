import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import JobSearchBar from "@/components/JobSearchBar/JobSearchBar";
import ActiveJobCard from "@/components/Common/ActiveJobCard/ActiveJobCard";
import { useJob } from "@/context/JobContext";
import { useActiveJobSelection } from "@/hooks/useActiveJobSelection";
import { useSupabase } from "@/hooks/useSupabase";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSupabase();
  const role =
    typeof user?.app_metadata?.role === "string" ? user.app_metadata.role : "";
  const {
    searchResultJob,
    matchingJobs,
    assignedJobs,
    isAssignedJobsLoading,
    assignedJobsError,
    refreshAssignedJobs,
  } = useJob();

  const { selectActiveJob } = useActiveJobSelection();

  const openForms = async (job: (typeof assignedJobs)[number]) => {
    await selectActiveJob(job);

    router.push({
      pathname: "/forms",
      params: { jobId: String(job.id) },
    });
  };

  const groupedJobs = Object.values(
    assignedJobs.reduce<Record<string, (typeof assignedJobs)[number][]>>(
      (groups, job) => {
        const baseNumber = job.job_base_number;

        (groups[baseNumber] ??= []).push(job);

        return groups;
      },
      {},
    ),
  ).map((variants) => {
    const primaryJob = variants.find((job) => !job.job_suffix) ?? variants[0];

    const suffixes = [
      ...new Set(
        variants
          .map((job) => job.job_suffix)
          .filter((suffix): suffix is string => Boolean(suffix)),
      ),
    ].sort();

    return {
      job: primaryJob,
      suffixes,
    };
  });

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-1 text-2xl font-bold text-slate-900">
          Dashboard
        </Text>

        <Text className="mb-5 text-sm text-slate-500">
          Search for a job or select one assigned to you.
        </Text>

        <JobSearchBar />

        {searchResultJob && (
          <View className="mb-6 mt-1 rounded-xl border border-slate-200 bg-white p-4">
            <ActiveJobCard
              job={searchResultJob}
              relatedJobs={matchingJobs}
              isSearchResult={true}
            />

            <Pressable
              className="items-center rounded-lg bg-slate-900 px-4 py-3"
              onPress={() => openForms(searchResultJob)}
            >
              <Text className="font-semibold text-white">Select Job</Text>
            </Pressable>
          </View>
        )}
        {role === "installer" && (
          <View className="mb-6">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-md font-bold uppercase tracking-wider text-slate-500">
                My Assigned Jobs
              </Text>

              {!isAssignedJobsLoading && (
                <Text className="text-sm text-slate-500">
                  {groupedJobs.length} job
                  {groupedJobs.length === 1 ? "" : "s"}
                </Text>
              )}
            </View>

            {isAssignedJobsLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#0f172a" />
                <Text className="mt-3 text-sm text-slate-500">
                  Loading your assigned jobs...
                </Text>
              </View>
            ) : assignedJobsError && assignedJobs.length === 0 ? (
              <View className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <Text className="font-semibold text-rose-700">
                  {assignedJobsError}
                </Text>

                <Pressable
                  className="mt-3 self-start rounded-lg bg-slate-900 px-4 py-2"
                  onPress={() => void refreshAssignedJobs()}
                >
                  <Text className="font-semibold text-white">Retry</Text>
                </Pressable>
              </View>
            ) : groupedJobs.length === 0 ? (
              <View className="rounded-xl border border-slate-200 bg-white p-4">
                <Text className="text-sm text-slate-600">
                  You don't have any active jobs assigned to you.
                </Text>
              </View>
            ) : (
              <>
                {assignedJobsError && (
                  <View className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <Text className="text-sm text-amber-800">
                      Could not refresh jobs. Showing previously loaded jobs.
                    </Text>
                  </View>
                )}

                {groupedJobs.map(({ job, suffixes }) => (
                  <Pressable
                    key={job.id}
                    className="mb-3 rounded-xl border border-slate-200 bg-white p-4 active:bg-slate-100"
                    onPress={() => openForms(job)}
                  >
                    <View className="mb-2 flex-row items-center justify-between">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <View className="rounded-md border border-slate-900 bg-slate-900 px-2.5 py-1">
                          <Text className="text-xs font-bold text-white">
                            #{job.job_base_number}
                          </Text>
                        </View>

                        {suffixes.length > 0 && (
                          <View className="rounded border border-slate-200 bg-slate-100 px-2 py-1">
                            <Text className="text-xs font-semibold text-slate-600">
                              - {suffixes.join(", ")}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text className="text-sm font-semibold text-blue-700">
                        Select →
                      </Text>
                    </View>

                    <Text className="text-sm font-semibold text-slate-700">
                      {job.sales_orders?.shipping_client_name ||
                        "Client not available"}
                    </Text>

                    <Text className="mt-1 text-sm text-slate-500">
                      {[
                        job.sales_orders?.shipping_street,
                        job.sales_orders?.shipping_city,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Address not available"}
                    </Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
