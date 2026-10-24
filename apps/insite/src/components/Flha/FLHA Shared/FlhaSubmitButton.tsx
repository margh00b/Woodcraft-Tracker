import React from "react";
import { Pressable, Text, ActivityIndicator } from "react-native";

interface FlhaSubmitButtonProps {
  label: string;
  disabled: boolean;
  isSubmitting: boolean;
  onPress: () => void;
}

export default function FlhaSubmitButton({
  label,
  disabled,
  isSubmitting,
  onPress,
}: FlhaSubmitButtonProps) {
  const isButtonDisabled = disabled || isSubmitting;

  return (
    <Pressable
      className={`p-4 rounded-xl items-center mb-6 ${
        !isButtonDisabled
          ? "bg-slate-900 active:bg-slate-800"
          : "bg-slate-300"
      }`}
      disabled={isButtonDisabled}
      onPress={onPress}
    >
      {isSubmitting ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text className="text-white font-bold text-lg">{label}</Text>
      )}
    </Pressable>
  );
}
