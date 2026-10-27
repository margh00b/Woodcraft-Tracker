"use client";

import { useSupabaseContext } from "@/providers/SupabaseProvider";

export function useSupabase() {
  const { supabase, isAuthenticated, isLoading, session, user } =
    useSupabaseContext();

  return {
    supabase,
    isAuthenticated,
    isLoading,
    session,
    user,
  };
}
