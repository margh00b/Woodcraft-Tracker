import { View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser, useAuth } from "@clerk/expo";
import { Slot } from "expo-router";
import TopBar from "@/components/TopBar/TopBar";
import toCapitalize from "@/utils/capitalize";
export default function AppShell() {
  const insets = useSafeAreaInsets();
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded, signOut } = useAuth();

  const isLoaded = authLoaded && userLoaded;
  const username = user?.username || "";
  const role = (user?.publicMetadata?.role as string) || "";

  if (!isLoaded) {
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
      {isSignedIn && (
        <TopBar
          name={toCapitalize(username)}
          role={toCapitalize(role)}
          signout={signOut}
        />
      )}
      <Slot />
    </View>
  );
}
