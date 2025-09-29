
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { PlusCircle } from "lucide-react";
import AddWeekDialog from "./_components/add-week-dialog";


export default function WeeksPage() {
    const { user } = useAuth();
    // This logic can be expanded later for specific roles within the "Semanas" module
    const canManage = user?.role === 'Administrador';

    const handleWeekAdded = () => {
        // TODO: Implement logic to refresh the list of weeks
        console.log("Week added, refresh needed.");
    }

    return (
        <>
            <PageHeader 
                title="Gestión de Semanas" 
                description="Organice al personal en semanas, asigne tareas y supervise la actividad."
            >
                {canManage && (
                    <AddWeekDialog onWeekAdded={handleWeekAdded}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Nueva Semana
                        </Button>
                    </AddWeekDialog>
                )}
            </PageHeader>
            <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold">Módulo en Construcción</h2>
                    <p className="text-muted-foreground mt-2">Aquí podrá ver y gestionar las semanas de trabajo.</p>
                </div>
            </div>
        </>
    );
}
