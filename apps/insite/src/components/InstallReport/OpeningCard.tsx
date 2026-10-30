import { Pressable, Switch, Text, TextInput, View } from "react-native";
import type { OpeningEntry } from "@/types/installReport";
import { PhotoGrid } from "./PhotoGrid";
import { useState } from "react";

type OpeningCardProps = {
  opening: OpeningEntry;
  onMeasurementChange: (value: string) => void;
  onAddPhotos: () => void;
  onRemovePhoto: (index: number) => void;
  onRemoveOpening?: () => void;
  disabled?: boolean;
  isNotApplicable: boolean;
  onToggleNotApplicable: () => void;
};

export function OpeningCard({
  opening,
  onMeasurementChange,
  onAddPhotos,
  onRemovePhoto,
  onRemoveOpening,
  disabled = false,
  isNotApplicable,
  onToggleNotApplicable,
}: OpeningCardProps) {
  const [top, setTop] = useState(
    opening.measurement?.split(",")[0]?.replace("Top:", "").trim() ||
      opening.measurement ||
      "",
  );
  const [bottom, setBottom] = useState(
    opening.measurement?.split(",")[1]?.replace("Bottom:", "").trim() || "",
  );

  const updateMeasurementString = (t: string, b: string) => {
    setTop(t);
    setBottom(b);
    onMeasurementChange(`Top: ${t || "—"}, Bottom: ${b || "—"}`);
  };
  return (
    <View
      className={`mb-4 rounded-xl border p-4 shadow-sm ${
        isNotApplicable
          ? "border-slate-200 bg-slate-100"
          : "border-slate-200 bg-white"
      }`}
    >
      <View className="flex-row items-center justify-between mb-4">
        <Text className="flex-1 text-sm font-bold text-slate-900 mr-2">
          {opening.label}
          {opening.isMandatory && <Text className="text-rose-500"> *</Text>}
        </Text>

        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-medium text-slate-500">N/A</Text>
          <Switch
            value={isNotApplicable}
            onValueChange={onToggleNotApplicable}
            disabled={disabled}
            trackColor={{ false: "#cbd5e1", true: "#64748b" }}
            thumbColor="#ffffff"
          />

          {onRemoveOpening && !disabled && (
            <Pressable onPress={onRemoveOpening} className="ml-1">
              <Text className="text-xs font-bold text-rose-500">Remove</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View className="relative">
        <View
          className={isNotApplicable ? "opacity-30" : ""}
          pointerEvents={isNotApplicable ? "none" : "auto"}
        >
          {opening.id != "fridge_opening" ? (
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-sm mb-3"
              placeholder="Enter exact measurement/location (e.g., 36.5)"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={opening.measurement}
              onChangeText={onMeasurementChange}
              editable={!disabled && !isNotApplicable}
            />
          ) : (
            <View className="flex-row gap-3 justify-center mb-3">
              <TextInput
                className="bg-slate-50 w-[50%] border border-slate-200 rounded-lg p-3 text-slate-900 text-sm mb-2"
                placeholder="Top (e.g., 36.5)"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                value={top}
                onChangeText={(t) => updateMeasurementString(t, bottom)}
                editable={!disabled && !isNotApplicable}
              />
              <TextInput
                className="bg-slate-50 w-[50%] border border-slate-200 rounded-lg p-3 text-slate-900 text-sm mb-2"
                placeholder="Bottom (e.g., 36.5)"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                value={bottom}
                onChangeText={(b) => updateMeasurementString(top, b)}
                editable={!disabled && !isNotApplicable}
              />
            </View>
          )}

          <PhotoGrid
            photos={opening.photos}
            onAdd={onAddPhotos}
            onRemove={onRemovePhoto}
            disabled={disabled || isNotApplicable}
          />
        </View>

        {isNotApplicable && (
          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center"
          >
            <View className="rounded-lg border border-slate-300 bg-slate-100/95 px-4 py-2">
              <Text className="text-sm font-semibold text-slate-600">
                Not applicable
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
