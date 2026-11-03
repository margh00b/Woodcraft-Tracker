import React from "react";
import { Image, Pressable, Text, View } from "react-native";

export type PhotoGridItem = {
  uri: string;
};

type PhotoGridProps = {
  photos: PhotoGridItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
};

export function PhotoGrid({
  photos,
  onAdd,
  onRemove,
  disabled = false,
}: PhotoGridProps) {
  return (
    <View className="flex-row flex-wrap gap-2.5">
      {photos.map((photo, index) => (
        <View key={`${photo.uri}-${index}`} className="relative w-24 h-24">
          <Image
            source={{ uri: photo.uri }}
            className="w-full h-full rounded-lg bg-slate-100"
            resizeMode="cover"
          />

          {!disabled && (
            <Pressable
              onPress={() => onRemove(index)}
              className="absolute -top-2 -right-2 bg-rose-500 w-6 h-6 rounded-full items-center justify-center border-2 border-white shadow-sm"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Text className="text-white text-xs font-bold leading-none">×</Text>
            </Pressable>
          )}
        </View>
      ))}

      {!disabled && (
        <Pressable
          onPress={onAdd}
          className="w-24 h-24 border-2 border-dashed border-slate-300 bg-slate-50 rounded-lg items-center justify-center active:bg-slate-100"
        >
          <Text className="text-slate-400 text-3xl font-light leading-none">+</Text>
          <Text className="text-slate-400 text-xs font-medium mt-1">Add Photo</Text>
        </Pressable>
      )}
    </View>
  );
}
