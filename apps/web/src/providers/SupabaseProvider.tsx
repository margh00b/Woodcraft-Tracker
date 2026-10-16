"use client";

import React, { ReactNode, createContext } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import useClerkToken from "@/hooks/useClerkToken";

export const SupabaseContext = createContext<SupabaseClient | null>(null);

let currentClerkToken: string | null | undefined = null;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (url, options = {}) => {
        const headers = new Headers(options?.headers);
        if (currentClerkToken) {
          headers.set("Authorization", `Bearer ${currentClerkToken}`);
        }
        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
  }
);

export default function SupabaseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const token = useClerkToken();

  currentClerkToken = token;

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}
