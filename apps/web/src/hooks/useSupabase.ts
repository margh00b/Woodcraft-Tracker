"use client";

import { useContext } from "react";
import { SupabaseContext } from "@/providers/SupabaseProvider";
import { ClerkTokenContext } from "@/providers/ClerkTokenProvider";

export function useSupabase() {
  const supabase = useContext(SupabaseContext);
  const token = useContext(ClerkTokenContext);

  if (!supabase) {
    throw new Error("useSupabase must be used within SupabaseProvider");
  }

  return {
    supabase,
    isAuthenticated: !!token,
  };
}
