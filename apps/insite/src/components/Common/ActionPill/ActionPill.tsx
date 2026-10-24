import React from "react";
import { Text, View, TouchableOpacity } from "react-native";

interface ActionPillProps {
  title: string;
  description: string;
  icon: string;
  badge?: string | number;
  onPress: () => void;
}

export default function ActionPill({
  title,
  description,
  icon,
  badge,
  onPress,
}: ActionPillProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm active:opacity-80 mb-4"
      onPress={onPress}
    >
      <View className="w-11 h-11 rounded-xl justify-center items-center mr-3.5">
        <Text className="text-xl">{icon}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-base font-semibold text-slate-900 mb-0.5">
          {title}
        </Text>
        <Text className="text-xs text-slate-500">{description}</Text>
      </View>

      {badge !== undefined && (
        <View className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 mr-2">
          <Text className="text-xs font-bold text-slate-800">{badge}</Text>
        </View>
      )}

      <Text className="text-lg font-bold text-slate-400">→</Text>
    </TouchableOpacity>
  );
}
