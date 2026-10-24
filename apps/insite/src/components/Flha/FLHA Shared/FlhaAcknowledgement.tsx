import React from "react";
import { View, Text, Pressable } from "react-native";

interface FlhaAcknowledgementProps {
  checked: boolean;
  onToggle: () => void;
}

export default function FlhaAcknowledgement({
  checked,
  onToggle,
}: FlhaAcknowledgementProps) {
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-center bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm"
    >
      <View
        className={`w-5 h-5 rounded-md border items-center justify-center mr-3 ${
          checked
            ? "bg-slate-900 border-slate-900"
            : "border-slate-300 bg-slate-50"
        }`}
      >
        {checked && (
          <Text className="text-white text-md font-bold">✓</Text>
        )}
      </View>
      <Text className="flex-1 text-md text-slate-700 font-medium">
        I participated in this assessment, understand the hazards and
        controls, confirm controls are in place, and will stop and reassess
        if conditions change.
      </Text>
    </Pressable>
  );
}
