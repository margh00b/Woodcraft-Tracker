import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface TopBarProps {
  name: string;
  role: string;
  initials?: string;
  status?: string;
  signout: () => void;
  onRefresh: () => Promise<void> | void;
}

export default function TopBar({
  name,
  role,
  initials,
  status = "Online",
  signout,
  onRefresh,
}: TopBarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const avatarText =
    initials ||
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() ||
    "??";

  const handleRefresh = async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <View className="flex-row justify-between items-center px-5 py-3.5 bg-[#21134B] border-b border-violet-400/20 shadow-sm overflow-hidden">
      <View pointerEvents="none" className="absolute -right-8 -top-16 h-40 w-40 rounded-full border-[22px] border-violet-300/10" />
      <View pointerEvents="none" className="absolute right-24 -bottom-12 h-28 w-28 rounded-full bg-violet-500/15" />
      <View className="flex-row items-center gap-3">
        <View className="relative">
          <View className="w-10 h-10 rounded-full bg-violet-400/25 border border-violet-200/30 justify-center items-center">
            <Text className="text-white font-bold text-xs">{avatarText}</Text>
          </View>

          {status === "Online" && (
            <View className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
          )}
        </View>

        <View>
          <Text className="font-bold text-white text-sm">{name}</Text>
          <Text className="text-xs text-violet-200">{role}</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        {role === "installer" && (
          <Pressable
            onPress={handleRefresh}
            disabled={isRefreshing}
            className="h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 active:bg-white/20"
            style={{ opacity: isRefreshing ? 0.5 : 1 }}
          >
            <Ionicons name="refresh" size={20} color="#6654D9" />
          </Pressable>
        )}

        <Pressable
          className="bg-white/10 active:bg-white/20 px-3.5 py-2 rounded-xl items-center border border-white/20"
          onPress={signout}
        >
          <Text className="text-white font-semibold text-xs">Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}
