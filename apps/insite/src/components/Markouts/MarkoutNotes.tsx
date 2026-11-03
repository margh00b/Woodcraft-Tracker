import React from "react";
import { Text, TextInput, View } from "react-native";

type MarkoutNotesProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function MarkoutNotes({
  value,
  onChange,
  disabled = false,
}: MarkoutNotesProps) {
  return (
    <View className="bg-white p-4 rounded-xl border border-slate-200 mb-5 shadow-sm">
      <Text className="text-md font-semibold text-slate-500 uppercase mb-2">
        Notes
      </Text>

      <TextInput
        className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-sm h-28"
        placeholder="Add any notes or details for this markout (optional)..."
        placeholderTextColor="#94a3b8"
        multiline
        editable={!disabled}
        textAlignVertical="top"
        value={value}
        onChangeText={onChange}
      />
    </View>
  );
}
