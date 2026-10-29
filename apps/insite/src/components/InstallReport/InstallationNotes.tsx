
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
    <View className="bg-white p-4 rounded-xl border border-slate-200 mb-5 shadow-sm">
      <Text className="text-md font-semibold text-slate-500 uppercase mb-2">
        Installation Notes
      </Text>

      <TextInput
        className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-sm h-24"
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
