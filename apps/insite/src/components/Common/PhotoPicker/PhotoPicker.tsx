import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { PhotoInfo, PhotoTarget } from "@/types/installReport";
import {
  createPhotoInfo,
  getErrorMessage,
} from "@/utils/installReports/photos";

type PhotoPickerModalProps = {
  target: PhotoTarget;
  onClose: () => void;
  onAddPhotos: (target: string, photos: PhotoInfo[]) => void;
  openings: { id: string; label: string }[];
};

export function PhotoPickerModal({
  target,
  onClose,
  onAddPhotos,
  openings,
}: PhotoPickerModalProps) {
  const [isPicking, setIsPicking] = useState(false);

  const handleTakePhoto = async () => {
    if (!target || isPicking) return;

    const currentTarget = target;
    const capturedPhotos: PhotoInfo[] = [];

    setIsPicking(true);
    onClose();

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Camera permission is required to capture photos.",
        );
        return;
      }

      while (true) {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 1,
        });

        if (result.canceled || !result.assets[0]) break;

        const asset = result.assets[0];
        capturedPhotos.push(createPhotoInfo(asset.uri, asset.mimeType));

        const takeAnother = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Photo Captured",
            `${capturedPhotos.length} photo(s) captured.`,
            [
              { text: "Done", onPress: () => resolve(false) },
              { text: "Take Another", onPress: () => resolve(true) },
            ],
            { cancelable: false },
          );
        });

        if (!takeAnother) break;
      }

      if (capturedPhotos.length > 0) {
        onAddPhotos(currentTarget, capturedPhotos);
      }
    } catch (error) {
      Alert.alert("Photo Error", getErrorMessage(error));
    } finally {
      setIsPicking(false);
    }
  };

  const handleChoosePhotos = async () => {
    if (!target || isPicking) return;

    const currentTarget = target;
    setIsPicking(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 0,
      });

      if (!result.canceled) {
        onAddPhotos(
          currentTarget,
          result.assets.map((asset) =>
            createPhotoInfo(asset.uri, asset.mimeType),
          ),
        );
      }

      onClose();
    } catch (error) {
      Alert.alert("Photo Error", getErrorMessage(error));
    } finally {
      setIsPicking(false);
    }
  };

  const targetLabel =
    target === "generic"
      ? "the overall installation or site conditions"
      : (openings.find((opening) => opening.id === target)?.label ??
        "this opening");

  return (
    <Modal
      visible={target !== null}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!isPicking) onClose();
      }}
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable
          className="flex-1"
          onPress={() => {
            if (!isPicking) onClose();
          }}
        />

        <View className="rounded-t-3xl bg-white px-5 pt-3 pb-8">
          <View className="self-center h-1.5 w-12 rounded-full bg-slate-300 mb-5" />

          <Text className="text-xl font-bold text-slate-900">Add Photos</Text>

          <Text className="text-sm text-slate-500 mt-1 mb-5">
            Add photos for {targetLabel}.
          </Text>

          <Pressable
            disabled={isPicking || !target}
            onPress={() => void handleTakePhoto()}
            className="flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-3 active:bg-slate-100"
          >
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-slate-900">
              <Text className="text-2xl text-white">📷</Text>
            </View>

            <View className="flex-1 ml-4">
              <Text className="text-base font-semibold text-slate-900">
                Take Photo
              </Text>
              <Text className="text-sm text-slate-500 mt-1">
                Take several photos, one at a time.
              </Text>
            </View>

            <Text className="text-xl text-slate-400">›</Text>
          </Pressable>

          <Pressable
            disabled={isPicking || !target}
            onPress={() => void handleChoosePhotos()}
            className="flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 p-4 active:bg-slate-100"
          >
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
              <Text className="text-2xl">🖼️</Text>
            </View>

            <View className="flex-1 ml-4">
              <Text className="text-base font-semibold text-slate-900">
                Choose from Library
              </Text>
              <Text className="text-sm text-slate-500 mt-1">
                Select multiple photos in one go.
              </Text>
            </View>

            <Text className="text-xl text-slate-400">›</Text>
          </Pressable>

          {isPicking && (
            <View className="flex-row items-center justify-center mt-5">
              <ActivityIndicator />
              <Text className="ml-2 text-sm text-slate-500">
                Opening photo picker...
              </Text>
            </View>
          )}

          <Pressable
            disabled={isPicking}
            onPress={onClose}
            className="items-center py-4 mt-2"
          >
            <Text className="text-base font-semibold text-slate-600">
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
