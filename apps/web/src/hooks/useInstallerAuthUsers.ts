"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "./useSupabase";

export type AuthUserOption = {
  id: string;
  email: string | null;
  username: string | null;
};

export function useInstallerAuthUsers() {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["installer-auth-users"],
    enabled: isAuthenticated,
    staleTime: 60_000,
    queryFn: async (): Promise<AuthUserOption[]> => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.access_token) {
        throw new Error("No active Supabase session.");
      }

      const response = await fetch("/api/installers/auth-users", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load Supabase Auth users.");
      }

      return result.users as AuthUserOption[];
    },
  });
}
