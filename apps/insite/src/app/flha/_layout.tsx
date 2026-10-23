import React from "react";
import { Stack } from "expo-router";

export default function FlhaLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#f8fafc" },
      }}
    >
      <Stack.Screen name="index" />

      <Stack.Screen name="new" />

      <Stack.Screen name="[id]" />
    </Stack>
  );
}
