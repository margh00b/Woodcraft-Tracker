"use client";

import React, { ReactNode, createContext, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

export const ClerkTokenContext = createContext<string | null>(null);

const parseJwt = (token: string) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = window.atob(base64);
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export default function ClerkTokenProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { getToken, sessionClaims } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const initializeToken = async () => {
      try {
        const supabaseToken = await getToken({
          template: process.env.NEXT_PUBLIC_CLERK_SUPABASE_TEMPLATE,
          //skipCache: true,
        });

        if (supabaseToken) {
          setToken(supabaseToken);
          const decoded = parseJwt(supabaseToken);
          const expiresAt = decoded?.exp;

          if (!expiresAt) return;

          const now = Math.floor(Date.now() / 1000);
          const expiresInSeconds = expiresAt - now;
          const refreshTimeMs = Math.max((expiresInSeconds - 60) * 1000, 10000);

          timeoutId = setTimeout(() => {
            initializeToken();
          }, refreshTimeMs);
        }
      } catch (error) {
        console.error("Failed to initialize Clerk token:", error);
        setToken(null);
      }
    };

    if (sessionClaims) {
      initializeToken();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [getToken, sessionClaims]);

  return (
    <ClerkTokenContext.Provider value={token}>
      {children}
    </ClerkTokenContext.Provider>
  );
}
