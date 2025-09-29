
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Flame } from 'lucide-react';

export default function WeeksLayout({
  children,
}: {
  children: React.ReactNode
}) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p>Cargando...</p>
            </div>
        );
    }

  return (
    <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between p-4 border-b bg-card">
            <h1 className="font-headline text-2xl font-semibold flex items-center gap-2">
                <Flame className="h-6 w-6 text-primary" />
                Módulo de Semanas
            </h1>
            <Button asChild variant="outline">
                <Link href="/dashboard">Volver al Portal</Link>
            </Button>
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-8">
            {children}
        </main>
    </div>
  )
}
