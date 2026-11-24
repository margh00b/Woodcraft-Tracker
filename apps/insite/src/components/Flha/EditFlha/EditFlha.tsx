import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSupabase } from "@/hooks/useSupabase";
import { KeyboardAwareContainer } from "@/components/Common/KeyboardAwareContainer/KeyboardAwareContainer";
import { useJobHydration } from "@/hooks/useJobHydration";
import { useFlhaRecord } from "@/hooks/useFlhaRecord";
import { useFlhaForm } from "@/hooks/useFlhaForm";
import {
  HazardAssessmentGrid,
  FlhaNotesField,
  FlhaAcknowledgement,
  FlhaSubmitButton,
} from "@/components/Flha/FLHA Shared";
import { invalidateFormDetailsCache } from "@/hooks/useFormDetails";

interface EditFlhaProps {
  flhaId: string;
}

export default function EditFlha({ flhaId }: EditFlhaProps) {
  const router = useRouter();
  const { supabase, user } = useSupabase();
  const username =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Unknown User";
  const scrollViewRef = useRef<ScrollView>(null);
  const [notesY, setNotesY] = useState(0);

  const { data: existingRecord, isLoading: isLoadingRecord } =
    useFlhaRecord(flhaId);

  useJobHydration(existingRecord?.job_id);

  const {
    hazardRatings,
    notes,
    setNotes,
    acknowledgement,
    isSubmitting,
    setIsSubmitting,
    handleRatingChange,
    toggleAcknowledgement,
    buildHazardsPayload,
    hydrateFromRecord,
  } = useFlhaForm();

  useEffect(() => {
    if (existingRecord) {
      hydrateFromRecord(existingRecord);
    }
  }, [existingRecord, hydrateFromRecord]);

  const handleNotesFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, notesY - 20),
        animated: true,
      });
    }, 150);
  };

  const handleUpdate = async () => {
    if (!acknowledgement) {
      Alert.alert(
        "Required",
        "Please acknowledge the safety assessment conditions before updating.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        hazards: buildHazardsPayload(),
        acknowledgement: acknowledgement,
        submitted_by: username,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .schema("insite")
        .from("flha")
        .update(payload)
        .eq("id", flhaId);

      if (error) throw error;

      if (existingRecord?.job_id) {
        invalidateFormDetailsCache(existingRecord.job_id, "flha");
      }

      Alert.alert(
        "Success",
        `FLHA Assessment #${flhaId} successfully updated.`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert(
        "Update Failed",
        err.message || "An unexpected error occurred.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingRecord) {
    return (
      <View className="flex-1 bg-[#F1F1F7] justify-center items-center">
        <ActivityIndicator size="large" color="#6654D9" />
        <Text className="mt-4 text-[#85849A] font-medium">
          Loading Assessment...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F1F1F7]">
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-[#E9E8F1]">
        <Pressable
          className="px-3 py-1.5 rounded-lg bg-[#F1EEFF] border border-[#E9E8F1]"
          onPress={() => router.back()}
        >
          <Text className="text-[#5141A5] font-medium text-md">← Back</Text>
        </Pressable>
        <Text className="text-lg font-bold text-[#17152D]">
          Edit FLHA #{flhaId}
        </Text>
        <View className="w-12" />
      </View>

      <KeyboardAwareContainer ref={scrollViewRef}>
        <HazardAssessmentGrid
          hazardRatings={hazardRatings}
          onRatingChange={handleRatingChange}
        />

        <View onLayout={(e) => setNotesY(e.nativeEvent.layout.y)}>
          <FlhaNotesField
            value={notes}
            onChangeText={setNotes}
            onFocus={handleNotesFocus}
          />
        </View>

        <FlhaAcknowledgement
          checked={acknowledgement}
          onToggle={toggleAcknowledgement}
        />

        <FlhaSubmitButton
          label="Update Assessment"
          disabled={!acknowledgement}
          isSubmitting={isSubmitting}
          onPress={handleUpdate}
        />
      </KeyboardAwareContainer>
    </View>
  );
}
