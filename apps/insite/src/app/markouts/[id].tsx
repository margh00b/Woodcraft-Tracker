import React from "react";
import { useLocalSearchParams } from "expo-router";
import { EditMarkout } from "@/components/Markouts";
import { View, Text } from "react-native";

export default function MarkoutEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-6">
        <Text className="text-slate-700 font-semibold text-center">
          Markout ID not found.
        </Text>
      </View>
    );
  }

  return <EditMarkout reportId={id} />;
}
