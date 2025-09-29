
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { PlusCircle } from "lucide-react";
import Link from "next/link";


export default function WeeksPage() {
    const { user } = useAuth();
    const canManage = user?.role === 'Administrador';

    return (
        <>
            <div className="flex items-center justify-between p-4 border-b bg-card">
                 <h1 className="font-headline text-2xl font-semibold">Módulo de Semanas</h1>
                 <Button asChild variant="outline">
                    <Link href="/">Volver al Portal</Link>
                 </Button>
            </div>
            <main className="p-8">
                <PageHeader 
                    title="Gestión de Semanas" 
                    description="Organice al personal en semanas, asigne tareas y supervise la actividad."
                >
                    {canManage && (
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Nueva Semana
                        </Button>
                    )}
                </PageHeader>
                <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold">Módulo en Construcción</h2>
                        <p className="text-muted-foreground mt-2">Aquí podrá ver y gestionar las semanas de trabajo.</p>
                    </div>
                </div>
            </main>
        </>
    );
}
