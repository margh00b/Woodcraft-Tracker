import React from "react";
import { Pressable, Text, View } from "react-native";

interface TopBarProps {
  name: string;
  role: string;
  initials?: string;
  status?: string;
  signout: () => void;
}

export default function TopBar({
  name,
  role,
  initials,
  status = "Online",
  signout,
}: TopBarProps) {
  // Generate fallback initials if not explicitly provided
  const avatarText =
    initials ||
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() ||
    "??";

  return (
    <View className="flex-row justify-between items-center px-5 py-3.5 bg-white border-b border-slate-200 shadow-sm">
      <View className="flex-row items-center gap-3">
        {/* Avatar Circle */}
        <View className="relative">
          <View className="w-10 h-10 rounded-full bg-slate-900 justify-center items-center">
            <Text className="text-white font-bold text-xs">{avatarText}</Text>
          </View>
          {status === "Online" && (
            <View className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
          )}
        </View>

        {/* Name and Role Details */}
        <View>
          <Text className="font-semibold text-slate-900 text-sm">{name}</Text>
          <Text className="text-xs text-slate-500">{role}</Text>
        </View>
      </View>

      {/* Action Button */}
      <Pressable
        className="bg-slate-100 active:bg-slate-200 px-3.5 py-2 rounded-lg items-center border border-slate-200"
        onPress={signout}
      >
        <Text className="text-slate-700 font-semibold text-xs">Sign Out</Text>
      </Pressable>
    </View>
  );
}
