import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Keyboard,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/expo";
import { useSupabase } from "../hooks/useSupabase";
import { KeyboardAwareContainer } from "@/components/KeyboardAwareContainer/KeyboardAwareContainer";
import { useJob, JobOption } from "../context/JobContext";

const HAZARD_CATEGORIES = [
  { key: "access_stairs_exits", label: "1) Access, stairs, and exits" },
  { key: "tools_and_equipment", label: "2) Tools and equipment" },
  {
    key: "vehicles_traffic_stacking",
    label: "3) Vehicles, Traffic and Material Stacking",
  },
  { key: "manual_handling_lifting", label: "4) Manual Handling and Lifting" },
  { key: "housekeeping_on_site", label: "5) Housekeeping on site" },
  { key: "chemicals", label: "6) Chemicals" },
  { key: "ladders_work_at_height", label: "7) Ladders and work at height" },
  {
    key: "weather_lighting_working_alone",
    label: "8) Weather, lighting or working alone",
  },
  {
    key: "other_trades_public_hazard",
    label: "9) Other Trades, public or site hazard",
  },
] as const;

type HazardRating = "acceptable" | "low" | "medium" | "high" | "n/a";

const RATINGS: {
  label: string;
  value: HazardRating;
  color: string;
  activeColor: string;
}[] = [
  {
    label: "Acc",
    value: "acceptable",
    color: "border-emerald-200 text-emerald-700 bg-emerald-50",
    activeColor: "bg-emerald-600 border-emerald-600 text-white",
  },
  {
    label: "Low",
    value: "low",
    color: "border-blue-200 text-blue-700 bg-blue-50",
    activeColor: "bg-blue-600 border-blue-600 text-white",
  },
  {
    label: "Med",
    value: "medium",
    color: "border-amber-200 text-amber-700 bg-amber-50",
    activeColor: "bg-amber-600 border-amber-600 text-white",
  },
  {
    label: "High",
    value: "high",
    color: "border-rose-200 text-rose-700 bg-rose-50",
    activeColor: "bg-rose-600 border-rose-600 text-white",
  },
  {
    label: "N/A",
    value: "n/a",
    color: "border-slate-200 text-slate-600 bg-slate-100",
    activeColor: "bg-slate-700 border-slate-700 text-white",
  },
];

export default function FlhaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const supabase = useSupabase();
  const { user } = useUser();
  const { selectedJob, setSelectedJob } = useJob();

  const [isLoadingJob, setIsLoadingJob] = useState(!selectedJob && !!params.jobId);
  const [notes, setNotes] = useState("");
  const [acknowledgement, setAcknowledgement] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const [hazardRatings, setHazardRatings] = useState<
    Record<string, HazardRating>
  >({
    access_stairs_exits: "n/a",
    tools_and_equipment: "n/a",
    vehicles_traffic_stacking: "n/a",
    manual_handling_lifting: "n/a",
    housekeeping_on_site: "n/a",
    chemicals: "n/a",
    ladders_work_at_height: "n/a",
    weather_lighting_working_alone: "n/a",
    other_trades_public_hazard: "n/a",
  });

  useEffect(() => {
    let isCancelled = false;

    async function loadJob() {
      if (!selectedJob && params.jobId) {
        setIsLoadingJob(true);
        try {
          const { data, error } = await supabase
            .from("jobs")
            .select(
              `
              id, 
              job_number,
              sales_orders (
                shipping_client_name,
                shipping_street,
                shipping_city
              )
            `,
            )
            .eq("id", params.jobId)
            .single();

          if (!isCancelled && !error && data) {
            setSelectedJob(data as JobOption);
          }
        } finally {
          if (!isCancelled) {
            setIsLoadingJob(false);
          }
        }
      }
    }

    loadJob();

    return () => {
      isCancelled = true;
    };
  }, [params.jobId, selectedJob, supabase, setSelectedJob]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        requestAnimationFrame(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        });
      },
    );

    return () => {
      showSub.remove();
    };
  }, []);

  const handleRatingChange = (categoryKey: string, rating: HazardRating) => {
    setHazardRatings((prev) => ({
      ...prev,
      [categoryKey]: rating,
    }));
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

      const username = user?.username || "Unknown User";

      const payload = {
        job_id: selectedJob.id,
        hazards: {
          ...hazardRatings,
          notes: notes.trim() || null,
        },
        acknowledgement: acknowledgement,
        submitted_by: username,
      };

      const { error } = await supabase
        .schema("insite")
        .from("flha")
        .insert([payload]);

      if (error) throw error;

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
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-200">
        <Pressable
          className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200"
          onPress={() => router.back()}
        >
          <Text className="text-slate-700 font-medium text-md">← Back</Text>
        </Pressable>
        <Text className="text-lg font-bold text-slate-900">FLHA Form</Text>
        <View className="w-12" />
      </View>
      <KeyboardAwareContainer ref={scrollViewRef}>
        {isLoadingJob ? (
          <View className="bg-white p-6 rounded-xl border border-slate-200 mb-5 shadow-sm items-center">
            <ActivityIndicator size="small" color="#0f172a" />
            <Text className="text-xs text-slate-500 mt-2">
              Loading job details...
            </Text>
          </View>
        ) : selectedJob ? (
          <View className="bg-white p-4 rounded-xl border border-slate-200 mb-5 shadow-sm">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Job
              </Text>
              <View className="px-2 py-0.5 rounded bg-slate-900">
                <Text className="text-[10px] font-semibold text-white">
                  #{selectedJob.job_number}
                </Text>
              </View>
            </View>

            <Text className="text-base font-bold text-slate-800">
              {selectedJob.sales_orders?.shipping_client_name ||
                "Client Name N/A"}
            </Text>
            <Text className="text-xs text-slate-600 mt-0.5">
              {selectedJob.sales_orders?.shipping_street || "Street N/A"}
              {", "}
              {selectedJob.sales_orders?.shipping_city || "City N/A"}
            </Text>
          </View>
        ) : (
          <View className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-5 shadow-sm">
            <Text className="text-sm font-bold text-amber-800 mb-1">
              No Job Selected
            </Text>
            <Text className="text-xs text-amber-700 mb-3">
              Please return to the dashboard to search and select a job before submitting this assessment.
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
                        onPress={() =>
                          handleRatingChange(category.key, rat.value)
                        }
                        className={`flex-1 py-2 rounded-lg border items-center justify-center ${
                          isSelected ? rat.activeColor : rat.color
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            isSelected ? "text-white" : "text-slate-700"
                          }`}
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

        <View className="bg-white p-4 rounded-xl border border-slate-200 mb-5 shadow-sm">
          <Text className="text-md font-semibold text-slate-500 uppercase mb-2">
            Notes
          </Text>
          <TextInput
            className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-sm h-24"
            placeholder="Detail any site-specific hazards or control measures..."
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <Pressable
          onPress={() => setAcknowledgement(!acknowledgement)}
          className="flex-row items-center bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm"
        >
          <View
            className={`w-5 h-5 rounded-md border items-center justify-center mr-3 ${
              acknowledgement
                ? "bg-slate-900 border-slate-900"
                : "border-slate-300 bg-slate-50"
            }`}
          >
            {acknowledgement && (
              <Text className="text-white text-md font-bold">✓</Text>
            )}
          </View>
          <Text className="flex-1 text-md text-slate-700 font-medium">
            I participated in this assessment, understand the hazards and
            controls, confirm controls are in place, and will stop and reassess
            if conditions change.
          </Text>
        </Pressable>

        <Pressable
          className={`p-4 rounded-xl items-center mb-6 ${
            selectedJob && acknowledgement && !isSubmitting
              ? "bg-slate-900 active:bg-slate-800"
              : "bg-slate-300"
          }`}
          disabled={!selectedJob || !acknowledgement || isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text className="text-white font-bold text-lg">
              Submit Assessment
            </Text>
          )}
        </Pressable>
      </KeyboardAwareContainer>
    </View>
  );
}
