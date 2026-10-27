import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Slot, useRouter, useSegments } from "expo-router";
import { useSupabase } from "@/hooks/useSupabase";
import TopBar from "@/components/TopBar/TopBar";
import toCapitalize from "@/utils/capitalize";

export default function AppShell() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();

  const { supabase, session, user, isAuthenticated, isLoading } = useSupabase();

  useEffect(() => {
    if (isLoading) return;

    const onSignInScreen = segments[0] === "signin";

    if (!isAuthenticated && !onSignInScreen) {
      router.replace("/signin");
    } else if (isAuthenticated && onSignInScreen) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, segments, router]);

  const username =
    typeof user?.user_metadata?.username === "string"
      ? user.user_metadata.username
      : (user?.email?.split("@")[0] ?? "");

  const role =
    typeof user?.app_metadata?.role === "string" ? user.app_metadata.role : "";

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out failed:", error.message);
    }
  };

  if (isLoading) {
    return (
      <View
        className="flex-1 justify-center items-center bg-slate-50"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      {session && (
        <TopBar
          name={toCapitalize(username)}
          role={toCapitalize(role)}
          signout={handleSignOut}
        />
      )}
      <Slot />
    </View>
  );
}
