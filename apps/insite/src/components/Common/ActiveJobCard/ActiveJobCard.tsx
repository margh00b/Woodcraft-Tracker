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
  const { assignedJobs } = useJob();

  const baseJobNumber = job.job_number.split("-")[0];

  const listToProcess = [
    ...assignedJobs.filter(
      (item) =>
        item.job_number === baseJobNumber ||
        item.job_number.startsWith(`${baseJobNumber}-`),
    ),
    job,
  ];

  const suffixes = Array.from(
    new Set(
      listToProcess
        .map((item) =>
          item.job_number.startsWith(`${baseJobNumber}-`)
            ? item.job_number.slice(baseJobNumber.length + 1)
            : "",
        )
        .filter(Boolean),
    ),
  ).sort();

  return (
    <View
      className={`rounded-xl border border-slate-200 shadow-sm ${
        isCompact ? "p-3.5" : "p-4 mb-5"
      } ${className || "bg-white"}`}
    >
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Active Job
        </Text>

        <View className="flex-row flex-wrap items-center gap-1.5">
          <View className="rounded-md border border-slate-900 bg-slate-900 px-2.5 py-1">
            <Text className="text-xs font-bold text-white">
              #{baseJobNumber}
            </Text>
          </View>

          {suffixes.length > 0 && (
            <View className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5">
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

      <Text className="mt-0.5 text-sm text-slate-600">
        {job.sales_orders?.shipping_street || "Street Name N/A"},{" "}
        {job.sales_orders?.shipping_city || "City N/A"}
      </Text>
    </View>
  );
}
