
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function MaterialsPage() {
    return (
        <>
            <PageHeader title="Gestión de Materiales" description="Inventario de materiales y equipos del cuartel.">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Material
                </Button>
            </PageHeader>
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
                <div className="flex flex-col items-center gap-1 text-center">
                    <h3 className="text-2xl font-bold tracking-tight">
                        Módulo de Materiales en Construcción
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Aquí podrá buscar, agregar y gestionar todo el inventario.
                    </p>
                </div>
            </div>
        </>
    );
}
