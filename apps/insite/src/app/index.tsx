import React from "react";
import {
  Text,
  View,
  Alert,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUser, useAuth } from "@clerk/expo";
import TopBar from "../components/TopBar/TopBar";
import ActionPill from "../components/ActionPill/ActionPill";
import JobSearchBar from "../components/JobSearchBar/JobSearchBar";
import toCapitalize from "@/utils/capitalize";
import { useJob } from "../context/JobContext";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded, signOut } = useAuth();
  const { selectedJob } = useJob();

  const isLoaded = authLoaded && userLoaded;
  const username = user?.username || "";
  const role = (user?.publicMetadata?.role as string) || "";

  if (!isLoaded) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      {isSignedIn ? (
        <View className="flex-1">
          <TopBar
            name={toCapitalize(username)}
            role={toCapitalize(role)}
            signout={signOut}
          />

          <ScrollView
            className="flex-1 px-5 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text className="text-2xl font-bold text-slate-900 mb-1">
              Dashboard
            </Text>
            <Text className="text-sm text-slate-500 mb-5">
              Search for a job to proceed with the forms.
            </Text>

            <JobSearchBar />

            <View className="mb-6">
              <Text className="text-md font-bold text-slate-500 uppercase tracking-wider mb-3">
                Forms
              </Text>

              <ActionPill
                title="Field Level Hazard Assessment"
                description={
                  selectedJob
                    ? `Job #${selectedJob.job_number} selected`
                    : "Mandatory site safety check"
                }
                icon="⚠️"
                onPress={() => {
                  if (!selectedJob) {
                    Alert.alert(
                      "Job Required",
                      "Please search and select a verified job before opening the FLHA form.",
                    );
                    return;
                  }
                  router.push({
                    pathname: "/flha",
                    params: { jobId: String(selectedJob.id) },
                  });
                }}
              />
            </View>
          </ScrollView>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center p-5">
          <Text className="text-lg mb-6 text-slate-700 text-center">
            Authentication required for field dashboard access.
          </Text>
          <Pressable
            className="bg-slate-900 px-6 py-3 rounded-lg"
            onPress={() => router.push("/signin")}
          >
            <Text className="text-white font-semibold">Go to Sign In</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
