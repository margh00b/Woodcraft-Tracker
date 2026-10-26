import { useAuth } from "@clerk/expo";
import { createClient } from "@supabase/supabase-js";

let globalGetToken: (() => Promise<string | null>) | null = null;

const supabaseInstance = createClient(
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

        if (globalGetToken) {
          try {
            clerkToken = await globalGetToken();
          } catch (error: any) {
            if (error?.name !== "ClerkOfflineError") {
              throw error;
            }
          }
        }

        const headers = new Headers(options?.headers);
        headers.set("apikey", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!);

        if (clerkToken) {
          headers.set("Authorization", `Bearer ${clerkToken}`);
        }

        return fetch(url, { ...options, headers });
      },
    },
  },
);

export const useSupabase = () => {
  const { getToken } = useAuth();
  globalGetToken = getToken;

  return supabaseInstance;
};
