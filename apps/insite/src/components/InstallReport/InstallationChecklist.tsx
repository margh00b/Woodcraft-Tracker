import { Pressable, Text, View } from "react-native";
import {
  CHECKLIST_ITEMS,
  type ChecklistKey,
  type ChecklistState,
} from "@/types/installReport";

type InstallationChecklistProps = {
  value: ChecklistState;
  onChange: (key: ChecklistKey) => void;
};

export function InstallationChecklist({
  value,
  onChange,
}: InstallationChecklistProps) {
  return (
    <View className="mb-5">
      <Text className="text-md font-semibold text-[#85849A] uppercase mb-3 px-1">
        Installation Checklist
      </Text>

      {CHECKLIST_ITEMS.map((item) => {
        const checked = value[item.key];

        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            className="flex-row items-center bg-white p-4 rounded-xl border border-[#E9E8F1] mb-2.5 shadow-sm active:bg-[#F1F1F7]"
          >
            <View
              className={`w-5 h-5 rounded-md border items-center justify-center mr-3 ${
                checked
                  ? "bg-[#5141A5] border-slate-900"
                  : "border-slate-300 bg-[#F1F1F7]"
              }`}
            >
              {checked && (
                <Text className="text-white text-xs font-bold">✓</Text>
              )}
            </View>

            <Text className="flex-1 text-sm font-medium text-[#302D4B]">
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
