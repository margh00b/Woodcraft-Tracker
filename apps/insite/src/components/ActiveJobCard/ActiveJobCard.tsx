import React from "react";
import { View, Text } from "react-native";
import { JobOption } from "@/context/JobContext";

interface ActiveJobCardProps {
  job: JobOption;
  variant?: "default" | "compact";
}

export default function ActiveJobCard({
  job,
  variant = "default",
}: ActiveJobCardProps) {
  const isCompact = variant === "compact";

  return (
    <View
      className={`bg-white rounded-xl border border-slate-200 shadow-sm ${isCompact ? "p-3.5" : "p-4 mb-5"}`}
    >
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Active Job
        </Text>
        <View className="px-2 py-0.5 rounded bg-slate-900">
          <Text className="text-[10px] font-semibold text-white">
            #{job.job_number}
          </Text>
        </View>
      </View>

      <Text
        className={`${isCompact ? "text-sm" : "text-base"} font-bold text-slate-800`}
      >
        {job.sales_orders?.shipping_client_name || "Client Name N/A"}
      </Text>
      <Text className="text-xs text-slate-600 mt-0.5">
        {job.sales_orders?.shipping_street || "Street Name N/A"},{" "}
        {job.sales_orders?.shipping_city || "City N/A"}
      </Text>
    </View>
  );
}
