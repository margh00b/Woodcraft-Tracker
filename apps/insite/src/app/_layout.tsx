import "../../global.css";
import React from "react";
import { ClerkProvider, ClerkLoaded } from "@clerk/expo";
import { tokenCache } from "@/utils/tokenCache";
import { JobProvider } from "@/context/JobContext";
import AppShell from "@/components/Shell/AppShell";

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <JobProvider>
          <AppShell />
        </JobProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
