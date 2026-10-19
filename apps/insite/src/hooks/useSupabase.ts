import { useAuth } from "@clerk/expo";
import { createClient } from "@supabase/supabase-js";
import { useMemo } from "react";

export const useSupabase = () => {
  const { getToken } = useAuth();

  const supabase = useMemo(() => {
    return createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          fetch: async (url, options: RequestInit = {}) => {
            let clerkToken: string | null = null;
            try {
              // Get standard token matching web app
              clerkToken = await getToken();
            } catch (error: any) {
              if (error?.name !== "ClerkOfflineError") {
                throw error;
              }
            }

            const headers = new Headers(options?.headers);

            // Explicitly set apikey alongside Authorization token
            headers.set("apikey", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!);

            if (clerkToken) {
              headers.set("Authorization", `Bearer ${clerkToken}`);
            }

            return fetch(url, { ...options, headers });
          },
        },
      },
    );
  }, [getToken]);

  return supabase;
};
