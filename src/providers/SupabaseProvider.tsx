"use client";

import React, { ReactNode, createContext, useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import useClerkToken from "@/hooks/useClerkToken";


export const SupabaseContext = createContext<SupabaseClient | null>(null);

export default function SupabaseProvider({
	children,
}: {
	children: ReactNode;
}) {
	const token = useClerkToken();
	const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

	useEffect(() => {
		const initializeSupabase = async () => {
			try {
				let headers = {};
				if (token) {
					headers = { Authorization: `Bearer ${token}` };
				}

				const client = createClient(
					process.env.NEXT_PUBLIC_SUPABASE_URL!,
					process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
					{
						global: {
							headers,
						},
					}
				);

				setSupabase(client);
			} catch (error) {
				console.error("Failed to initialize Supabase client:", error);
				setSupabase(null);
			}
		};

		initializeSupabase();
	}, [token]);

	return (
		<SupabaseContext.Provider value={supabase}>
			{children}
		</SupabaseContext.Provider>
	);
}
