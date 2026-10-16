import React from 'react';
import { Text, View } from 'react-native';

interface TopBarProps {
  initials: string;
  name: string;
  role: string;
  status: string;
}

export default function TopBar({ initials, name, role, status }: TopBarProps) {
  return (
    <View className="flex-row justify-between items-center px-5 py-4 bg-white border-b border-slate-200 shadow-sm">
      <View className="flex-row items-center space-x-3">
        <View className="w-10 h-10 rounded-full bg-slate-300 justify-center items-center">
          <Text className="font-bold text-slate-700">{initials}</Text>
        </View>
        <View className="ml-3">
          <Text className="font-semibold text-slate-900 text-sm">{name}</Text>
          <Text className="text-xs text-slate-500">{role}</Text>
        </View>
      </View>
      
      <View className="flex-row items-center bg-slate-100 px-3 py-1.5 rounded-full space-x-1.5">
        <View className="w-2 h-2 rounded-full bg-primary-500 mr-1.5" />
        <Text className="text-xs font-medium text-primary-700">{status}</Text>
      </View>
    </View>
  );
}