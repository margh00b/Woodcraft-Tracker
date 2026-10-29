import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

type CustomOpeningModalProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (label: string) => void;
};

export function CustomOpeningModal({
  visible,
  onClose,
  onAdd,
}: CustomOpeningModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!visible) setName("");
  }, [visible]);

  const handleAdd = () => {
    const label = name.trim();
    if (!label) return;

    onAdd(label);
    setName("");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center px-6">
        <View className="bg-white p-5 rounded-2xl shadow-xl">
          <Text className="text-lg font-bold text-slate-900 mb-2">
            New Opening / Area
          </Text>

          <Text className="text-sm text-slate-500 mb-4">
            Enter the name of the new opening (e.g., "Prep Sink", "Wine
            Cooler").
          </Text>

          <TextInput
            className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-sm mb-5"
            placeholder="Area Name"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <View className="flex-row justify-end gap-3">
            <Pressable onPress={onClose} className="px-4 py-2 rounded-lg">
              <Text className="text-slate-500 font-bold">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleAdd}
              disabled={!name.trim()}
              className={`px-4 py-2 rounded-lg ${
                name.trim() ? "bg-slate-900" : "bg-slate-300"
              }`}
            >
              <Text className="text-white font-bold">Add Area</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
