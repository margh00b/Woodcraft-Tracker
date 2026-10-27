import React, { useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  Pressable,
} from "react-native";
import { useFormDetails } from "@/hooks/useFormDetails"; // 👈 Using the shared form hook
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface InstallReportListProps {
  jobId: number;
  onSelectReport?: (reportId: number) => void;
}

export default function InstallReportList({
  jobId,
  onSelectReport,
}: InstallReportListProps) {
  const insets = useSafeAreaInsets();

  // Fetching via useFormDetails using the "install_reports" form type
  const {
    forms: reports,
    isLoading,
    error,
    refetch,
  } = useFormDetails(jobId, "install_reports", {
    autoFetch: true,
  });

  // 👇 Matches FLHA behavior: automatically re-fetches every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (jobId) {
        refetch(false);
      }
    }, [jobId, refetch]),
  );

  if (isLoading && reports.length === 0) {
    return (
      <View className="p-8 items-center justify-center">
        <ActivityIndicator size="small" color="#0f172a" />
        <Text className="text-xs text-slate-500 mt-2">
          Loading installation reports...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
        <Text className="text-sm font-semibold text-rose-700">
          Failed to load installation reports
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="mt-2 bg-rose-600 px-3 py-1.5 rounded-lg self-start"
        >
          <Text className="text-xs text-white font-medium">Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (reports.length === 0) {
    return (
      <View className="p-6 bg-white border border-slate-200 rounded-xl items-center justify-center shadow-sm">
        <Text className="text-base font-semibold text-slate-800">
          No Reports Logged
        </Text>
        <Text className="text-xs text-slate-500 text-center mt-1">
          There are no installation reports submitted for this job yet.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ marginBottom: insets.bottom + 10 }}>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelectReport?.(item.id)}
            className="bg-white p-4 rounded-xl border border-slate-200 mb-3 shadow-sm active:bg-slate-50"
          >
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

            <View className="pt-2 border-t border-slate-100 flex-row justify-between items-center">
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
        )}
      />
    </View>
  );
}
