
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ServicesPage() {
    return (
        <>
            <PageHeader title="Registro de Servicios" description="Gestione todas las intervenciones y servicios del departamento.">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Registrar Servicio
                </Button>
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Servicios Recientes</CardTitle>
                    <CardDescription>Aquí se mostrará un listado de los últimos servicios registrados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">Aún no hay servicios registrados.</p>
                        <p className="text-sm text-muted-foreground mt-2">Haga clic en "Registrar Servicio" para empezar.</p>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
