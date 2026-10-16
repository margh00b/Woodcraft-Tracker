import "../global.css";
import React from "react";
import { Stack } from "expo-router";
// Import global CSS if using NativeWind's CSS setup
// import "../global.css";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hides the default header so your custom top bars look clean
      }}
    />
  );
}
