import React from "react";
import { View, Text, TextInput } from "react-native";

interface FlhaNotesFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
}

export default function FlhaNotesField({
  value,
  onChangeText,
  onFocus,
}: FlhaNotesFieldProps) {
  return (
    <View className="bg-white p-4 rounded-xl border border-slate-200 mb-5 shadow-sm">
      <Text className="text-md font-semibold text-slate-500 uppercase mb-2">
        Notes
      </Text>
      <TextInput
        className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-sm h-24"
        placeholder="Detail any site-specific hazards or control measures..."
        placeholderTextColor="#94a3b8"
        multiline
        textAlignVertical="top"
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
      />
    </View>
  );
}
