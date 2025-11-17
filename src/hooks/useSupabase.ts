"use client";

import { useContext } from 'react';
import { SupabaseContext } from '@/providers/SupabaseProvider';

/**
 * Hook that returns the authenticated Supabase client from context
 */
export function useSupabase() {
  const supabase = useContext(SupabaseContext);

  return supabase;
}
