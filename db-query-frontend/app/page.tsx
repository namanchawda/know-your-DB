'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const connectionId = localStorage.getItem('connectionId');

    if (connectionId) {
      router.replace('/dashboard');
    } else {
      router.replace('/connect');
    }
  }, []);

  return null; // nothing renders at /
}
