import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSupabase } from "../hooks/useSupabase";

interface JobOption {
  id: string | number;
  job_number: string;
  sales_orders?: {
    shipping_client_name?: string;
    shipping_street?: string;
    shipping_city?: string;
  } | null;
}

export default function FlhaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const supabase = useSupabase();

  // Search State
  const [jobNumberInput, setJobNumberInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [matchingJobs, setMatchingJobs] = useState<JobOption[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobOption | null>(null);

  // Form State
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const cleanInput = jobNumberInput.trim();

    if (cleanInput.length < 5) {
      setMatchingJobs([]);
      setSelectedJob(null);
      setIsVerifying(false);
      setHasSearched(false);
      return;
    }

    setHasSearched(false);
    const timer = setTimeout(async () => {
      try {
        setIsVerifying(true);

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
          .ilike("job_number", `%${cleanInput}%`)
          .order("job_number", { ascending: true })
          .limit(10);

        if (error) {
          setMatchingJobs([]);
          setSelectedJob(null);
          setHasSearched(true);
          return;
        }

        const results = (data as JobOption[]) || [];

        setMatchingJobs(results);
        setSelectedJob(results.length > 0 ? results[0] : null);
        setHasSearched(true);
      } catch (err) {
        setMatchingJobs([]);
        setSelectedJob(null);
        setHasSearched(true);
      } finally {
        setIsVerifying(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [jobNumberInput]);

  const cleanLength = jobNumberInput.trim().length;

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-200">
        <Pressable
          className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200"
          onPress={() => router.back()}
        >
          <Text className="text-slate-700 font-medium text-xs">← Back</Text>
        </Pressable>
        <Text className="text-base font-bold text-slate-900">FLHA Form</Text>
        <View className="w-12" />
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Job Verification */}
        <View className="bg-white p-4 rounded-xl border border-slate-200 mb-5 shadow-sm">
          <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">
            Job Number:
          </Text>

          <TextInput
            className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-sm font-semibold tracking-wider"
            placeholder="Type Job #..."
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            value={jobNumberInput}
            onChangeText={(text) => {
              setJobNumberInput(text);
              setSelectedJob(null);
              setHasSearched(false);
            }}
          />

          <View className="mt-3">
            {cleanLength > 0 && cleanLength < 5 && (
              <Text className="text-xs text-slate-400">
                Enter at least 5 digits ({cleanLength}/5)
              </Text>
            )}

            {isVerifying && (
              <View className="flex-row items-center py-1">
                <ActivityIndicator size="small" color="#0f172a" />
                <Text className="text-xs text-slate-600 font-medium ml-2">
                  Searching database...
                </Text>
              </View>
            )}

            {!isVerifying &&
              hasSearched &&
              cleanLength >= 5 &&
              matchingJobs.length > 0 && (
                <View>
                  {/* Display-only list of detected job suffixes */}
                  <View className="flex-column items-center justify-between mb-2.5">
                    <Text className="text-xs font-medium text-slate-600 mb-5">
                      {matchingJobs.length === 1
                        ? "✓ Active job verified:"
                        : `✓ ${matchingJobs.length} matching jobs found:`}
                    </Text>
                    <View className="flex-row gap-1.5 flex-wrap">
                      {matchingJobs.map((job, idx) => (
                        <View
                          key={job.id}
                          className={`px-2 py-0.5 rounded border ${
                            idx === 0
                              ? "bg-slate-900 border-slate-900"
                              : "bg-slate-100 border-slate-200"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-semibold ${
                              idx === 0 ? "text-white" : "text-slate-600"
                            }`}
                          >
                            #{job.job_number}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Selected Job Client & Address Info Box */}
                  {selectedJob && (
                    <View className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                      <Text className="text-sm font-bold text-slate-800">
                        {selectedJob.sales_orders?.shipping_client_name ||
                          "Client Name N/A"}
                      </Text>
                      <Text className="text-sm text-slate-600 mt-0.5">
                        {selectedJob.sales_orders?.shipping_street ||
                          "Street N/A"}
                        ,{" "}
                        {selectedJob.sales_orders?.shipping_city || "City N/A"}
                      </Text>
                    </View>
                  )}
                </View>
              )}

            {!isVerifying &&
              hasSearched &&
              cleanLength >= 5 &&
              matchingJobs.length === 0 && (
                <View className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
                  <Text className="text-rose-700 font-semibold text-xs">
                    ✕ Job #{jobNumberInput.trim()} does not exist
                  </Text>
                </View>
              )}
          </View>
        </View>

        {/* Assessment Notes */}
        <View className="bg-white p-4 rounded-xl border border-slate-200 mb-8 shadow-sm">
          <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">
            Assessment Notes
          </Text>
          <TextInput
            className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-sm h-24"
            placeholder="Detail any site-specific hazards and precautions..."
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Submit Action */}
        <Pressable
          className={`p-4 rounded-xl items-center ${
            selectedJob ? "bg-slate-900 active:bg-slate-800" : "bg-slate-300"
          }`}
          disabled={!selectedJob}
          onPress={() => {
            Alert.alert(
              "Success",
              `Assessment logged for Job #${selectedJob?.job_number}`,
            );
            router.back();
          }}
        >
          <Text className="text-white font-bold text-base">
            Submit Assessment
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
