import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useJob } from "@/context/JobContext";
import { useJobSearch } from "@/hooks/useJobSearch";
import ActiveJobCard from "@/components/Shared/ActiveJobCard/ActiveJobCard";

export default function JobSearchBar() {
  const { searchJobs, isSearching, reset } = useJobSearch();
  const {
    selectedJob,
    setSelectedJob,
    searchQuery,
    setSearchQuery,
    matchingJobs,
    setMatchingJobs,
    clearJobState,
  } = useJob();

  const [jobNumberInput, setJobNumberInput] = useState(searchQuery);
  const [hasSearched, setHasSearched] = useState(matchingJobs.length > 0);

  useEffect(() => {
    const cleanInput = jobNumberInput.trim();

    if (cleanInput.length < 5) {
      if (matchingJobs.length > 0 || selectedJob !== null) {
        reset();
        setMatchingJobs([]);
        setSelectedJob(null);
        setSearchQuery(cleanInput);
      }
      setHasSearched(false);
      return;
    }

    if (cleanInput === searchQuery && matchingJobs.length > 0) {
      setHasSearched(true);
      return;
    }

    setHasSearched(false);
    const timer = setTimeout(async () => {
      try {
        const results = await searchJobs(cleanInput);
        setMatchingJobs(results);
        setSelectedJob(results.length > 0 ? results[0] : null);
        setSearchQuery(cleanInput);
        setHasSearched(true);
      } catch {
        setMatchingJobs([]);
        setSelectedJob(null);
        setSearchQuery(cleanInput);
        setHasSearched(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    jobNumberInput, 
    searchJobs,
    reset,
    setMatchingJobs,
    setSelectedJob,
    setSearchQuery,
  ]);

  const cleanLength = jobNumberInput.trim().length;

  const handleClearJob = () => {
    reset();
    setJobNumberInput("");
    clearJobState();
    setHasSearched(false);
  };

  return (
    <View className="bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-md font-bold text-slate-500 uppercase tracking-wider">
          Job Number:
        </Text>
        {(selectedJob || jobNumberInput.length > 0) && (
          <Pressable onPress={handleClearJob}>
            <Text className="text-md font-semibold text-rose-600">Clear</Text>
          </Pressable>
        )}
      </View>

      <TextInput
        className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-sm font-semibold tracking-wider"
        placeholder="Type Job #..."
        placeholderTextColor="#94a3b8"
        keyboardType="number-pad"
        value={jobNumberInput}
        onChangeText={(text) => {
          setJobNumberInput(text);
          setHasSearched(false);
        }}
      />

      <View className="mt-3">
        {cleanLength > 0 && cleanLength < 5 && (
          <Text className="text-md text-slate-400">
            Enter at least 5 digits ({cleanLength}/5)
          </Text>
        )}

        {isSearching && (
          <View className="flex-row items-center py-1">
            <ActivityIndicator size="small" color="#0f172a" />
            <Text className="text-md text-slate-600 font-medium ml-2">
              Searching database...
            </Text>
          </View>
        )}

        {!isSearching &&
          hasSearched &&
          cleanLength >= 5 &&
          selectedJob && (
            <ActiveJobCard
              job={selectedJob}
              variant="compact"
              className="mt-3 bg-slate-50"
            />
          )}

        {!isSearching &&
          hasSearched &&
          cleanLength >= 5 &&
          matchingJobs.length === 0 && (
            <View className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
              <Text className="text-rose-700 font-semibold text-md">
                ✕ Job #{jobNumberInput.trim()} does not exist
              </Text>
            </View>
          )}
      </View>
    </View>
  );
}
