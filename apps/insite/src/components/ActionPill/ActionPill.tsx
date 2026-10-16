import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';

interface ActionPillProps {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
}

export default function ActionPill({ title, description, icon, onPress }: ActionPillProps) {
  return (
    <TouchableOpacity 
      className="flex-row items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm active:opacity-80 mb-4"
      onPress={onPress}
    >
      <View className="w-11 h-11 rounded-xl bg-primary-100 justify-center items-center mr-3.5">
        <Text className="text-xl">{icon}</Text>
      </View>
      
      <View className="flex-1">
        <Text className="text-base font-semibold text-slate-900 mb-0.5">
          {title}
        </Text>
        <Text className="text-xs text-slate-500">{description}</Text>
      </View>

      <Text className="text-lg font-bold text-primary-300 ml-2">→</Text>
    </TouchableOpacity>
  );
}