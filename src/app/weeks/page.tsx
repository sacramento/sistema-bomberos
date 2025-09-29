
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import AddWeekDialog from "./_components/add-week-dialog";
import WeekList from "./_components/week-list";


export default function WeeksPage() {
    const { user } = useAuth();
    // This logic can be expanded later for specific roles within the "Semanas" module
    const canManage = user?.role === 'Administrador';
    
    // State to trigger a refresh of the week list
    const [refreshSignal, setRefreshSignal] = useState(false);

    const handleWeekAdded = () => {
        setRefreshSignal(prev => !prev);
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
            
            <WeekList refreshSignal={refreshSignal} />
        </>
    );
}
