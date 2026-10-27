import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type SupabaseContextValue = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

export default function SupabaseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);
      setIsLoading(false);
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;

        if (error) {
          console.error("Failed to load Supabase session:", error);
        }

        setSession(data.session);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (!mounted) return;

        console.error("Failed to load Supabase session:", error);
        setIsLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SupabaseContext.Provider
      value={{
        supabase,
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session?.user,
        isLoading,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabaseContext() {
  const context = useContext(SupabaseContext);

  if (!context) {
    throw new Error("SupabaseProvider is missing");
  }

  return context;
}
