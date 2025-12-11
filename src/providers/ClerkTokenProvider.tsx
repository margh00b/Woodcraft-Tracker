"use client";

import React, { ReactNode, createContext, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

interface SessionClaims {
  exp: number;
  [key: string]: unknown;
}

export const ClerkTokenContext = createContext<string | null>(null);

export default function ClerkTokenProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { getToken, sessionClaims } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const initializeToken = async () => {
      try {
        if (!sessionClaims) {
          console.warn("No session claims available");
          return;
        }

        const claims = sessionClaims as SessionClaims;
        const expiresAt = claims.exp;

        if (!expiresAt) {
          console.warn("No token expiration time available");
          return;
        }

        // refresh + get token
        const supabaseToken = await getToken({
          template: "supabase",
          skipCache: true,
        });

        if (supabaseToken) {
          setToken(supabaseToken);

          const now = Date.now();
          const expiresIn = expiresAt * 1000 - now;

          // Refresh token 1 minute BEFORE it expires
          const refreshTime = expiresIn - 60000;

          if (refreshTime > 0) {
            const timeout = setTimeout(() => {
              initializeToken(); // Recursively refresh token
            }, refreshTime);

            return () => clearTimeout(timeout);
          }
        }
      } catch (error) {
        console.error("Failed to initialize Clerk token:", error);
        setToken(null);
      }
    };

    initializeToken();
  }, [getToken, sessionClaims]);

  return (
    <ClerkTokenContext.Provider value={token}>
      {children}
    </ClerkTokenContext.Provider>
  );
}
