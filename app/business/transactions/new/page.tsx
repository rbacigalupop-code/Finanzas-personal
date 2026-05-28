'use client';

import { useRouter } from 'next/navigation';

// Redirect to transactions page which has the form inline
export default function NewBusinessTxRedirect() {
  const router = useRouter();
  // Use effect would cause flash; just redirect immediately via layout
  if (typeof window !== 'undefined') {
    router.replace('/business/transactions');
  }
  return null;
}
