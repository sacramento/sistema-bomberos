
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import AddWeekDialog from "../_components/add-week-dialog";
import WeekList from "../_components/week-list";
import { Week } from "@/lib/types";
import { getWeeks } from "@/services/weeks.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";

export default function MyWeekPage() {
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const { toast } = useToast();
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [loading, setLoading] = useState(true);

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

    const fetchWeeks = async () => {
        setLoading(true);
        try {
            const data = await getWeeks();
            setWeeks(data);
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo cargar el listado de semanas.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeeks();
    }, [toast]);
    
    const handleDataChange = () => {
        fetchWeeks();
    }
    
    const weeksForUser = useMemo(() => {
        if (loading || !user) return [];
        if (canManage || activeRole === 'Oficial') {
            return weeks;
        }
        return weeks.filter(week => 
            week.allMembers?.some(member => member.legajo === user.id)
        );
    }, [weeks, user, activeRole, loading, canManage]);

    const weeksGroupedByFirehouse = useMemo(() => {
        return weeksForUser.reduce((acc, week) => {
            const firehouse = week.firehouse || 'Sin Cuartel';
            if (!acc[firehouse]) {
                acc[firehouse] = [];
            }
            acc[firehouse].push(week);
            return acc;
        }, {} as Record<string, Week[]>);
    }, [weeksForUser]);

    const firehouseOrder = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

    return (
        <>
            <PageHeader 
                title="Mi Semana" 
                description="Gestione y visualice las semanas de guardia asignadas."
            >
                {canManage && (
                    <AddWeekDialog onWeekAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Semana
                        </Button>
                    </AddWeekDialog>
                )}
            </PageHeader>
            
            <div className="space-y-12">
               {firehouseOrder.map(firehouse => (
                    weeksGroupedByFirehouse[firehouse] && weeksGroupedByFirehouse[firehouse].length > 0 && (
                        <div key={firehouse} className="mb-8">
                            <h3 className="font-headline text-2xl font-semibold tracking-tight border-b pb-2 mb-4">{firehouse}</h3>
                            <WeekList weeks={weeksGroupedByFirehouse[firehouse]} isLoading={loading} onDataChange={handleDataChange} canManage={canManage} />
                        </div>
                    )
                ))}
                {!loading && weeksForUser.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                        <div className="text-center">
                            <h2 className="text-xl font-semibold">No hay semanas para mostrar</h2>
                            <p className="text-muted-foreground mt-2">No estás asignado a ninguna semana.</p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
