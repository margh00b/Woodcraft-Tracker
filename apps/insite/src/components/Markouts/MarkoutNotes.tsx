import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";

type MarkoutNotesProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const QUICK_MARKOUT_OPTIONS = [
  { buttonLabel: "1st", noteText: "1st Markout" },
  { buttonLabel: "2nd", noteText: "2nd Markout" },
  { buttonLabel: "3rd", noteText: "3rd Markout" },
] as const;

export function MarkoutNotes({
  value,
  onChange,
  disabled = false,
}: MarkoutNotesProps) {
  const handleQuickInsert = (noteText: string) => {
    if (disabled) return;
    const trimmed = value.trimEnd();
    onChange(trimmed ? `${trimmed}\n${noteText}` : noteText);
  };

  return (
    <View className="bg-white p-4 rounded-xl border border-[#E9E8F1] mb-5 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-md font-semibold text-[#85849A] uppercase">
          Notes
        </Text>
        <View className="flex-row gap-2">
          <Text className="px-3 py-1 text-md font-semibold text-[#5141A5]">
            Markout:{" "}
          </Text>
          {QUICK_MARKOUT_OPTIONS.map((option) => (
            <Pressable
              key={option.buttonLabel}
              disabled={disabled}
              onPress={() => handleQuickInsert(option.noteText)}
              className={`px-3 py-1 rounded-lg border border-[#E9E8F1] ${
                disabled
                  ? "bg-slate-100 opacity-50"
                  : "bg-[#F1EEFF] active:bg-[#E2DBFF]"
              }`}
            >
              <Text className="text-md font-semibold text-[#5141A5]">
                {option.buttonLabel}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <TextInput
        className="bg-[#F1F1F7] border border-[#E9E8F1] rounded-lg p-3 text-[#17152D] text-sm h-28"
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
