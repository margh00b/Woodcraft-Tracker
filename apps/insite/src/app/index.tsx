import React from "react";
import { Text, View, Alert, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUser, useAuth } from "@clerk/expo";
import TopBar from "../components/TopBar/TopBar";
import ActionPill from "../components/ActionPill/ActionPill";
import toCapitalize from "@/utils/capitalize";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded, signOut } = useAuth();

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
        <>
          <TopBar
            name={toCapitalize(username)}
            role={toCapitalize(role)}
            signout={signOut}
          />

          <View className="p-5">
            <Text className="text-2xl font-bold text-slate-900 mb-1">
              Dashboard
            </Text>
            <Text className="text-sm text-slate-500 mb-6">
              Select a form to proceed.
            </Text>

            <ActionPill
              title="Field Level Hazard Assessment"
              description="Mandatory site safety check"
              icon="⚠️"
              onPress={() => router.push("/flha")}
            />
          </View>
        </>
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
