import React from "react";
import { View, Text } from "react-native";
import { JobOption, useJob } from "@/context/JobContext";

interface ActiveJobCardProps {
  job: JobOption;
  variant?: "default" | "compact";
  className?: string;
}

export default function ActiveJobCard({
  job,
  variant = "default",
  className = "",
}: ActiveJobCardProps) {
  const isCompact = variant === "compact";
  const { matchingJobs } = useJob();

  const baseJobNumber = job.job_number.includes("-")
    ? job.job_number.split("-")[0]
    : job.job_number;

  const listToProcess =
    matchingJobs.length > 0 &&
    matchingJobs.some((m) => m.job_number.startsWith(baseJobNumber))
      ? matchingJobs.filter((m) => m.job_number.startsWith(baseJobNumber))
      : [job];

  const suffixes = Array.from(
    new Set(
      listToProcess
        .map((item) =>
          item.job_number.includes("-")
            ? item.job_number.split("-").slice(1).join("-")
            : "",
        )
        .filter(Boolean),
    ),
  );

  return (
    <View
      className={`rounded-xl border border-slate-200 shadow-sm ${
        isCompact ? "p-3.5" : "p-4 mb-5"
      } ${className || "bg-white"}`}
    >
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Active Job
        </Text>
        <View className="flex-row gap-1.5 flex-wrap items-center">
          <View className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-900">
            <Text className="text-xs font-bold text-white">
              #{baseJobNumber}
            </Text>
          </View>
          {suffixes.length > 0 && (
            <View className="px-2 py-0.5 rounded border bg-slate-100 border-slate-200">
              <Text className="text-[11px] font-semibold text-slate-600">
                - {suffixes.join(", ")}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Text
        className={`${
          isCompact ? "text-md" : "text-lg"
        } font-bold text-slate-800`}
      >
        {job.sales_orders?.shipping_client_name || "Client Name N/A"}
      </Text>
      <Text className="text-sm text-slate-600 mt-0.5">
        {job.sales_orders?.shipping_street || "Street Name N/A"},{" "}
        {job.sales_orders?.shipping_city || "City N/A"}
      </Text>
    </View>
  );
}
