import React from "react";
import { useLocalSearchParams } from "expo-router";
import EditFlha from "@/components/Flha/EditFlha/EditFlha";
import { View, Text } from "react-native";

export default function FlhaEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id)
    return (
      <View className="flex-1 bg-slate-50">
        <Text>
          Something went wrong! Contact your Software Admin for assistance.
        </Text>
      </View>
    );

  return <EditFlha flhaId={id} />;
}
