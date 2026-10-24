import React from "react";
import { View, Text, Pressable } from "react-native";
import {
  HAZARD_CATEGORIES,
  RATINGS,
  HazardRating,
} from "@/components/Flha/flha.constants";

interface HazardAssessmentGridProps {
  hazardRatings: Record<string, HazardRating>;
  onRatingChange: (categoryKey: string, rating: HazardRating) => void;
}

export default function HazardAssessmentGrid({
  hazardRatings,
  onRatingChange,
}: HazardAssessmentGridProps) {
  return (
    <View className="mb-5">
      <Text className="text-md font-semibold text-slate-500 uppercase mb-3 px-1">
        Hazard Assessments (Select Ratings)
      </Text>

      {HAZARD_CATEGORIES.map((category) => {
        const currentVal = hazardRatings[category.key];
        return (
          <View
            key={category.key}
            className="bg-white p-3.5 rounded-xl border border-slate-200 mb-3 shadow-sm"
          >
            <Text className="text-md font-bold text-slate-800 mb-2.5">
              {category.label}
            </Text>
            <View className="flex-row gap-1.5 justify-between">
              {RATINGS.map((rat) => {
                const isSelected = currentVal === rat.value;
                return (
                  <Pressable
                    key={rat.value}
                    onPress={() => onRatingChange(category.key, rat.value)}
                    className={`flex-1 py-2 rounded-lg border items-center justify-center ${
                      isSelected ? rat.activeColor : rat.color
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${isSelected ? "text-white" : "text-slate-700"}`}
                    >
                      {rat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
