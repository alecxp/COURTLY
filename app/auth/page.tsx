'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function AuthPage() { const router = useRouter(); useEffect(() => { router.replace('/'); }, [router]); return <main className="locker-page"><p>Reindirizzamento allo spogliatoio COURTLY…</p></main>; }
