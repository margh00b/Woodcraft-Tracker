import { Image, Pressable, Text, View } from "react-native";
import type { PhotoInfo } from "@/types/installReport";

type PhotoGridProps = {
  photos: PhotoInfo[];
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
    <View className="flex-row flex-wrap gap-2">
      {photos.map((photo, index) => (
        <View key={`${photo.uri}-${index}`} className="relative w-20 h-20">
          <Image
            source={{ uri: photo.uri }}
            className="w-full h-full rounded-md bg-slate-100"
            resizeMode="cover"
          />

          {!disabled && (
            <Pressable
              onPress={() => onRemove(index)}
              className="absolute -top-2 -right-2 bg-rose-500 w-6 h-6 rounded-full items-center justify-center border-2 border-white"
            >
              <Text className="text-white text-xs font-bold">×</Text>
            </Pressable>
          )}
        </View>
      ))}

      {!disabled && (
        <Pressable
          onPress={onAdd}
          className="w-20 h-20 border-2 border-dashed border-slate-300 bg-slate-50 rounded-md items-center justify-center active:bg-slate-100"
        >
          <Text className="text-slate-400 text-2xl font-light">+</Text>
        </Pressable>
      )}
    </View>
  );
}
