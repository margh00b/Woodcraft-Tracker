import React, { useMemo, useState } from "react";
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
import { useJob, type JobOption } from "@/context/JobContext";
import { useActiveJobSelection } from "@/hooks/useActiveJobSelection";
import { useSupabase } from "@/hooks/useSupabase";

type ScheduledTab = "Today" | "This Week" | "All";

function localDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getWeekStart(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function getInspectionDate(job: JobOption) {
  const installation = Array.isArray(job.installation) ? job.installation[0] : job.installation;
  return installation?.inspection_date ?? null;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSupabase();
  const role = typeof user?.app_metadata?.role === "string" ? user.app_metadata.role : "";
  const isMarkoutsUser = role === "markouts";
  const isInspectionUser = role === "inspection";
  const isScheduledJobsUser = isMarkoutsUser || isInspectionUser;

  const {
    searchResultJob,
    matchingJobs,
    assignedJobs,
    isAssignedJobsLoading,
    assignedJobsError,
    refreshAssignedJobs,
    loadMoreAssignedJobs,
    hasMoreAssignedJobs,
    isLoadingMoreAssignedJobs,
  } = useJob();
  const { selectActiveJob } = useActiveJobSelection();
  const [scheduledTab, setScheduledTab] = useState<ScheduledTab>("Today");

  const openForms = async (job: (typeof assignedJobs)[number]) => {
    await selectActiveJob(job);
    router.push({ pathname: "/forms", params: { jobId: String(job.id) } });
  };

  const groupedJobs = Object.values(
    assignedJobs.reduce<Record<string, (typeof assignedJobs)[number][]>>(
      (groups, job) => {
        (groups[job.job_base_number] ??= []).push(job);
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
    return { job: primaryJob, suffixes, variants };
  });

  const todayKey = localDateKey(new Date());
  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const scheduledJobs = useMemo(
    () => isScheduledJobsUser ? groupedJobs : [],
    [groupedJobs, isScheduledJobsUser],
  );
  const tabs: ScheduledTab[] = ["All", "Today", "This Week"];

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-1 text-2xl font-bold text-slate-900">Dashboard</Text>
        <Text className="mb-5 text-sm text-slate-500">
          Search for a job or select one assigned to you.
        </Text>
        <JobSearchBar />

        {searchResultJob && (
          <View className="mb-6 mt-1 rounded-[22px] border border-[#E9E8F1] bg-white p-4">
            <ActiveJobCard job={searchResultJob} relatedJobs={matchingJobs} isSearchResult />
            <Pressable
              className="items-center rounded-lg bg-[#5141A5] px-4 py-3"
              onPress={() => openForms(searchResultJob)}
            >
              <Text className="font-semibold text-white">Select Job</Text>
            </Pressable>
          </View>
        )}

        {(role === "installer" || isScheduledJobsUser) && (
          <View className="mb-6">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-md font-bold uppercase tracking-wider text-[#85849A]">
                {isMarkoutsUser ? "Scheduled Markouts" : isInspectionUser ? "Scheduled Inspections" : "My Assigned Jobs"}
              </Text>
              {!isAssignedJobsLoading && (
                <Text className="text-sm text-[#85849A]">
                  {isScheduledJobsUser && hasMoreAssignedJobs
                    ? `${assignedJobs.length}+ jobs`
                    : `${isScheduledJobsUser ? scheduledJobs.length : groupedJobs.length} jobs`}
                </Text>
              )}
            </View>

            {isScheduledJobsUser && (
              <View className="mb-4 flex-row rounded-xl bg-[#ECEAF6] p-1">
                {tabs.map((tab) => (
                  <Pressable
                    key={tab}
                    onPress={() => {
                      setScheduledTab(tab);
                      void refreshAssignedJobs(tab);
                    }}
                    className={`flex-1 items-center rounded-lg py-2.5 ${scheduledTab === tab ? "bg-white" : ""}`}
                  >
                    <Text className={`w-full text-center text-sm font-semibold ${scheduledTab === tab ? "text-[#5141A5]" : "text-[#85849A]"}`}>
                      {tab}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {isAssignedJobsLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#6654D9" />
                <Text className="mt-3 text-sm text-[#85849A]">Loading your jobs...</Text>
              </View>
            ) : assignedJobsError && assignedJobs.length === 0 ? (
              <View className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <Text className="font-semibold text-rose-700">{assignedJobsError}</Text>
                <Pressable
                  className="mt-3 self-start rounded-lg bg-[#5141A5] px-4 py-2"
                  onPress={() => void refreshAssignedJobs(scheduledTab)}
                >
                  <Text className="font-semibold text-white">Retry</Text>
                </Pressable>
              </View>
            ) : (isScheduledJobsUser ? scheduledJobs.length : groupedJobs.length) === 0 ? (
              <View className="rounded-xl border border-[#E9E8F1] bg-white p-4">
                <Text className="text-sm text-[#68677D]">
                  {isMarkoutsUser
                    ? `No markouts scheduled for ${scheduledTab.toLowerCase()}.`
                    : isInspectionUser
                      ? `No inspections scheduled for ${scheduledTab.toLowerCase()}.`
                      : "You don't have any active jobs assigned to you."}
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
                {(isScheduledJobsUser ? scheduledJobs : groupedJobs).map(({ job, suffixes, variants }) => {
                  const markoutDates = Array.from(
                    new Map(
                      variants.flatMap(({ sales_orders }) => {
                        const order = Array.isArray(sales_orders) ? sales_orders[0] : sales_orders;
                        return [
                          order?.markout_date ? { date: order.markout_date, label: "First Markout" } : null,
                          order?.second_markout_date ? { date: order.second_markout_date, label: "Second Markout" } : null,
                        ].filter((item): item is { date: string; label: string } => Boolean(item));
                      }).map((item) => [`${item.label}-${item.date}`, item] as const),
                    ).values(),
                  );
                  const inspectionDates = Array.from(
                    new Set(
                      variants
                        .map((variant) => getInspectionDate(variant))
                        .filter((date): date is string => Boolean(date)),
                    ),
                  ).sort();
                  const visibleDates = isMarkoutsUser
                    ? markoutDates.filter(({ date }) => {
                        if (scheduledTab === "All") return true;
                        if (scheduledTab === "Today") return localDateKey(date) === todayKey;
                        const value = parseLocalDate(date);
                        return value >= weekStart && value < weekEnd;
                      })
                    : inspectionDates.filter((date) => {
                        if (scheduledTab === "All") return true;
                        if (scheduledTab === "Today") return localDateKey(date) === todayKey;
                        const value = new Date(date);
                        return value >= weekStart && value < weekEnd;
                      });

                  return (
                    <Pressable
                      key={`${job.id}-${job.job_number}`}
                      className="mb-3 rounded-xl border border-[#E9E8F1] bg-white p-4 active:bg-[#F1EEFF]"
                      onPress={() => openForms(job)}
                    >
                      <View className="mb-2 flex-row items-center justify-between">
                        <View className="flex-row flex-wrap items-center gap-2">
                          <View className="rounded-md border border-slate-900 bg-[#5141A5] px-2.5 py-1">
                            <Text className="text-xs font-bold text-white">#{job.job_base_number}</Text>
                          </View>
                          {suffixes.length > 0 && (
                            <View className="rounded border border-[#E9E8F1] bg-[#F1EEFF] px-2 py-1">
                              <Text className="text-xs font-semibold text-[#68677D]">- {suffixes.join(", ")}</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-sm font-semibold text-blue-700">Select →</Text>
                      </View>
                      <Text className="text-sm font-semibold text-[#5141A5]">
                        {job.sales_orders?.shipping_client_name || "Client not available"}
                      </Text>
                      <Text className="mt-1 text-sm text-[#85849A]">
                        {[job.sales_orders?.shipping_street, job.sales_orders?.shipping_city].filter(Boolean).join(", ") || "Address not available"}
                      </Text>

                      {isMarkoutsUser && visibleDates.map(({ date, label }) => (
                        <View key={`${job.id}-${label}-${date}`} className="mt-2 self-start rounded-lg border border-[#DDD7FA] bg-[#F5F2FF] px-3 py-2">
                          <Text className="text-xs font-bold text-[#5141A5]">{label}</Text>
                          <Text className="mt-0.5 text-sm font-semibold text-[#39306F]">{formatDate(date)}</Text>
                        </View>
                      ))}
                      {isInspectionUser && visibleDates.map((date) => (
                        <View key={`${job.id}-inspection-${date}`} className="mt-2 self-start rounded-lg border border-[#DDD7FA] bg-[#F5F2FF] px-3 py-2">
                          <Text className="text-xs font-bold text-[#5141A5]">Scheduled Inspection</Text>
                          <Text className="mt-0.5 text-sm font-semibold text-[#39306F]">{formatDate(date)}</Text>
                        </View>
                      ))}
                    </Pressable>
                  );
                })}

                {isScheduledJobsUser && hasMoreAssignedJobs && (
                  <Pressable
                    className="mt-2 items-center rounded-xl border border-[#DDD7FA] bg-white px-4 py-3"
                    onPress={() => void loadMoreAssignedJobs()}
                    disabled={isLoadingMoreAssignedJobs}
                  >
                    {isLoadingMoreAssignedJobs ? (
                      <ActivityIndicator color="#6654D9" />
                    ) : (
                      <Text className="font-semibold text-[#5141A5]">Load More</Text>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
