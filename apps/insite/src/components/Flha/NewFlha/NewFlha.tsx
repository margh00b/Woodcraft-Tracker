import React, { useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSupabase } from "@/hooks/useSupabase";
import { KeyboardAwareContainer } from "@/components/Common/KeyboardAwareContainer/KeyboardAwareContainer";
import { useJobHydration } from "@/hooks/useJobHydration";
import { useFlhaForm } from "@/hooks/useFlhaForm";
import {
  HazardAssessmentGrid,
  FlhaNotesField,
  FlhaAcknowledgement,
  FlhaSubmitButton,
} from "@/components/Flha/FLHA Shared";
import { invalidateFormDetailsCache } from "@/hooks/useFormDetails";

export default function NewFlha() {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const { supabase, user } = useSupabase();

  const username =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Unknown User";
  const scrollViewRef = useRef<ScrollView>(null);
  const [notesY, setNotesY] = useState(0);

  const jobId = params.jobId ? Number(params.jobId) : undefined;
  const { selectedJob } = useJobHydration(
    isNaN(jobId as number) ? undefined : jobId,
  );

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
  } = useFlhaForm();

  const handleNotesFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, notesY - 20),
        animated: true,
      });
    }, 150);
  };

  const handleSubmit = async () => {
    if (!selectedJob) {
      Alert.alert("Error", "Please select a valid job on the dashboard.");
      return;
    }
    if (!acknowledgement) {
      Alert.alert(
        "Required",
        "Please acknowledge the safety assessment conditions before submitting.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        job_id: selectedJob.id,
        hazards: buildHazardsPayload(),
        acknowledgement: acknowledgement,
        submitted_by: username,
      };

      const { error } = await supabase
        .schema("insite")
        .from("flha")
        .insert([payload]);

      if (error) throw error;

      invalidateFormDetailsCache(selectedJob.id, "flha");

      Alert.alert(
        "Success",
        `FLHA Assessment successfully logged for Job #${selectedJob.job_number}`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert(
        "Submission Failed",
        err.message || "An unexpected error occurred.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F1F1F7]">
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-[#E9E8F1]">
        <Pressable
          className="px-3 py-1.5 rounded-lg bg-[#F1EEFF] border border-[#E9E8F1]"
          onPress={() => router.back()}
        >
          <Text className="text-[#5141A5] font-medium text-md">← Back</Text>
        </Pressable>
        <Text className="text-lg font-bold text-[#17152D]">New FLHA Form</Text>
        <View className="w-12" />
      </View>

      <KeyboardAwareContainer ref={scrollViewRef}>
        {!selectedJob && (
          <View className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-5 shadow-sm">
            <Text className="text-sm font-bold text-amber-800 mb-1">
              No Job Selected
            </Text>
            <Text className="text-xs text-amber-700 mb-3">
              Please return to the dashboard to search and select a job before
              submitting this assessment.
            </Text>
            <Pressable
              className="bg-amber-600 py-2 px-3 rounded-lg self-start"
              onPress={() => router.back()}
            >
              <Text className="text-xs font-semibold text-white">
                ← Return to Dashboard
              </Text>
            </Pressable>
          </View>
        )}

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
          label="Submit Assessment"
          disabled={!selectedJob || !acknowledgement}
          isSubmitting={isSubmitting}
          onPress={handleSubmit}
        />
      </KeyboardAwareContainer>
    </View>
  );
}
