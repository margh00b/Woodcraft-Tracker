"use client";

import { useContext } from 'react';
import { ClerkTokenContext } from '@/providers/ClerkTokenProvider';

export default function useClerkToken() {
  const token = useContext(ClerkTokenContext);

  return token;
}
