
'use client';

import { PageHeader } from "@/components/page-header";
import MaterialLeadsManager from "../_components/material-leads-manager";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function MaterialLeadsPage() {
    const { user } = useAuth();

    return (
        <>
            <PageHeader 
                title="Gestión de Encargados" 
                description="Asigne a los responsables técnicos del inventario por cada unidad móvil."
            />
            
            <div className="mb-6">
                <Alert className="bg-primary/5 border-primary/20">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertTitle className="font-bold">Nota sobre Responsabilidades</AlertTitle>
                    <AlertDescription className="text-sm">
                        Los integrantes asignados aquí podrán gestionar el equipamiento de su móvil correspondiente. 
                        Es posible asignar <strong>múltiples encargados</strong> por unidad para facilitar la rotación de guardias.
                    </AlertDescription>
                </Alert>
            </div>

            <MaterialLeadsManager actor={user} />
        </>
    );
}
