"use client";

import { useContext } from 'react';
import { ClerkTokenContext } from '@/providers/ClerkTokenProvider';

/**
 * Hook that returns the Clerk JWT token from context
 */
export default function useClerkToken() {
  const token = useContext(ClerkTokenContext);

  return token;
}
