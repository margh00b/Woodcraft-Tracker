import "../../global.css";
import React from "react";
import { JobProvider } from "@/context/JobContext";
import AppShell from "@/components/Shell/AppShell";
import SupabaseProvider from "@/providers/SupabaseProvider";

export default function RootLayout() {
  return (
    <SupabaseProvider>
      <JobProvider>
        <AppShell />
      </JobProvider>
    </SupabaseProvider>
  );
}
