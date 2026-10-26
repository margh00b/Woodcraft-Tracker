// components/InstallReport/InstallReportCard/InstallReportCard.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";

interface InstallReportCardProps {
  item: {
    id: number;
    submitted_by?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  onSelectReport?: (id: number) => void;
}

export default function InstallReportCard({
  item,
  onSelectReport,
}: InstallReportCardProps) {
  return (
    <Pressable
      onPress={() => onSelectReport?.(item.id)}
      className="bg-white p-4 rounded-xl border border-slate-200 mb-3 shadow-sm active:bg-slate-50"
    >
      {/* Header Row: Title Badge & Author */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          <Text className="text-xs font-bold text-slate-800">
            Report #{item.id}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            Submitted By
          </Text>
          <Text
            className="text-xs font-semibold text-slate-800"
            numberOfLines={1}
          >
            {item.submitted_by || "Unknown"}
          </Text>
        </View>
      </View>

      {/* Footer Section: Timestamps */}
      <View className="pt-2 border-t border-slate-100 flex-row justify-between items-center">
        {/* Created Date & Time */}
        <View>
          <Text className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">
            Created
          </Text>
          <Text className="text-xs font-medium text-slate-600">
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "—"}
          </Text>
        </View>

        {/* Updated Date & Time */}
        {Boolean(item.updated_at) && (
          <View className="items-end">
            <Text className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">
              Updated
            </Text>
            <Text className="text-xs font-medium text-slate-600">
              {new Date(item.updated_at!).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}