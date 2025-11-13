
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClothingReportsPage() {
    return (
        <>
            <PageHeader title="Reportes de Ropería" description="Genere fichas de equipamiento por bombero y vea estadísticas." />

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">En Construcción</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Esta sección de reportes está en desarrollo.</p>
                </CardContent>
            </Card>
        </>
    );
}
