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

export default function JobSearchBar() {
  const { searchJobs, isSearching, reset } = useJobSearch();
  const {
    searchResultJob,
    setSearchResultJob,
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
      if (matchingJobs.length > 0 || searchResultJob !== null) {
        reset();
        clearJobState();
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
        setSearchResultJob(results.length > 0 ? results[0] : null);
        setSearchQuery(cleanInput);
        setHasSearched(true);
      } catch {
        setMatchingJobs([]);
        setSearchResultJob(null);
        setSearchQuery(cleanInput);
        setHasSearched(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    jobNumberInput,
    searchJobs,
    reset,
    clearJobState,
    searchQuery,
    matchingJobs.length,
    searchResultJob,
    setMatchingJobs,
    setSearchResultJob,
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
    <View className=" rounded-xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm font-bold uppercase tracking-wider text-slate-600">
          Job Number
        </Text>

        {(searchResultJob || jobNumberInput.length > 0) && (
          <Pressable
            onPress={handleClearJob}
            hitSlop={8}
            className="rounded-md px-2 py-1 active:bg-rose-50"
          >
            <Text className="text-sm font-semibold text-rose-600">Clear</Text>
          </Pressable>
        )}
      </View>

      <TextInput
        className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-base font-semibold text-slate-900"
        placeholder="Enter job number..."
        placeholderTextColor="#94a3b8"
        keyboardType="number-pad"
        returnKeyType="search"
        value={jobNumberInput}
        onChangeText={(text) => {
          setJobNumberInput(text);
          setHasSearched(false);
        }}
      />

      <View className="mt-3">
        {cleanLength > 0 && cleanLength < 5 && (
          <Text className="text-sm text-slate-400">
            Enter at least 5 digits ({cleanLength}/5)
          </Text>
        )}

        {isSearching && (
          <View className="flex-row items-center py-1">
            <ActivityIndicator size="small" color="#0f172a" />
            <Text className="ml-2 text-sm text-slate-500">
              Searching jobs...
            </Text>
          </View>
        )}

        {!isSearching &&
          hasSearched &&
          cleanLength >= 5 &&
          matchingJobs.length === 0 && (
            <View className="flex-row items-start rounded-lg border border-rose-200 bg-rose-50 p-3">
              <Text className="mr-2 text-sm font-bold text-rose-600">!</Text>
              <Text className="flex-1 text-sm text-rose-700">
                No job found for "{jobNumberInput.trim()}".
              </Text>
            </View>
          )}
      </View>
    </View>
  );
}
