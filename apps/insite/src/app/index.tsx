import React from "react";
import { Text, View, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopBar from "../components/TopBar/TopBar";
import ActionPill from "../components/ActionPill/ActionPill";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      <TopBar
        initials="JD"
        name="John Doe"
        role="Lead Installer"
        status="Online"
      />

      <View className="p-5">
        <Text className="text-2xl font-bold text-slate-900 mb-1">
          Field Dashboard
        </Text>
        <Text className="text-sm text-slate-500 mb-6">
          Select an on-site requirement to proceed.
        </Text>

        <ActionPill
          title="Field Level Hazard Assessment"
          description="Mandatory site safety check"
          icon="⚠️"
          onPress={() =>
            Alert.alert(
              "FLHA",
              "Navigating to Field Level Hazard Assessment form!",
            )
          }
        />
      </View>
    </View>
  );
}
