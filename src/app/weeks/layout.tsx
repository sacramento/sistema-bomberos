
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function WeeksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between p-4 border-b bg-card">
            <h1 className="font-headline text-2xl font-semibold">Módulo de Semanas</h1>
            <Button asChild variant="outline">
                <Link href="/">Volver al Portal</Link>
            </Button>
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-8">
            {children}
        </main>
    </div>
  )
}
