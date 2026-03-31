
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import AddWeekDialog from "../_components/add-week-dialog";
import WeekList from "../_components/week-list";
import { Week, Firefighter } from "@/lib/types";
import { getWeeks } from "@/services/weeks.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyWeekPage() {
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const { toast } = useToast();
    const [allWeeks, setAllWeeks] = useState<Week[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const activeRole = getActiveRole(pathname);
    const isMaster = activeRole === 'Master';

    const fetchAllData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [weeksData, firefightersData] = await Promise.all([
                getWeeks(),
                getFirefighters()
            ]);
            setAllWeeks(weeksData);
            setAllFirefighters(firefightersData);
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudieron cargar los datos.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        if (isMounted && user) {
            fetchAllData();
        }
    }, [isMounted, user]);

    const { weeksToShow, canManage, loggedInFirefighter } = useMemo(() => {
        if (!isMounted || !user) {
            return { weeksToShow: [], canManage: false, loggedInFirefighter: null };
        }

        const firefighterData = allFirefighters.find(f => f.legajo === user.id);
        const canManageWeeks = isMaster || activeRole === 'Administrador' || activeRole === 'Encargado';
        
        let visibleWeeks: Week[] = [];

        if (isMaster || activeRole === 'Oficial') {
            visibleWeeks = [...allWeeks];
        } else if ((activeRole === 'Encargado' || activeRole === 'Administrador') && firefighterData) {
            visibleWeeks = allWeeks.filter(week => week.firehouse === firefighterData.firehouse);
        } else {
            visibleWeeks = allWeeks.filter(week => 
                week.allMemberIds?.includes(user.id) || week.leadId === user.id || week.driverId === user.id
            );
        }

        return {
            weeksToShow: visibleWeeks, 
            canManage: canManageWeeks,
            loggedInFirefighter: firefighterData || null
        };

    }, [isMounted, allWeeks, allFirefighters, user, activeRole, isMaster]);


    if (!isMounted || loading) {
        return (
             <div className="p-8 space-y-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        )
    }
    
    return (
        <>
            <PageHeader 
                title={isMaster ? "Gestión de Semanas" : "Mis Semanas"}
                description={isMaster ? "Cree, edite o clone semanas de guardia." : "Aquí puedes ver todas tus semanas asignadas."}
            >
                {canManage && (
                    <AddWeekDialog onWeekAdded={fetchAllData} loggedInFirefighter={loggedInFirefighter}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Semana
                        </Button>
                    </AddWeekDialog>
                )}
            </PageHeader>
            
            <WeekList 
                weeks={weeksToShow} 
                isLoading={loading} 
                onDataChange={fetchAllData} 
                canManageGenerally={canManage} 
                loggedInFirefighter={loggedInFirefighter}
            />
        </>
    );
}
