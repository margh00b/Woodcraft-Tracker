
import { Text, TextInput, View } from "react-native";

type InstallationNotesProps = {
  value: string;
  onChange: (value: string) => void;
};

export function InstallationNotes({
  value,
  onChange,
}: InstallationNotesProps) {
  return (
    <View className="bg-white p-4 rounded-xl border border-[#E9E8F1] mb-5 shadow-sm">
      <Text className="text-md font-semibold text-[#85849A] uppercase mb-2">
        Installation Notes
      </Text>

      <TextInput
        className="bg-[#F1F1F7] border border-[#E9E8F1] rounded-lg p-3 text-[#17152D] text-sm h-24"
        placeholder="Document any modifications, missing materials, or site notes..."
        placeholderTextColor="#94a3b8"
        multiline
        textAlignVertical="top"
        value={value}
        onChangeText={onChange}
      />
    </View>
  );
}
