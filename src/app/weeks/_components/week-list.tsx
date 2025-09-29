
'use client';

import { useEffect, useState, useMemo } from "react";
import { Week } from "@/lib/types";
import { getWeeks } from "@/services/weeks.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ArrowRight, User, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";

interface WeekListProps {
    refreshSignal: boolean;
}

export default function WeekList({ refreshSignal }: WeekListProps) {
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useAuth();

    const fetchWeeks = async () => {
        if (!user) return; // Don't fetch if user is not available
        setLoading(true);
        try {
            const data = await getWeeks();
            
            // If user is not an admin, filter weeks to show only those they are part of.
            if (user.role !== 'Administrador') {
                const userWeekIds = new Set<string>();
                data.forEach(week => {
                    const isMember = week.allMembers?.some(member => member.legajo === user.id);
                    if (isMember) {
                        userWeekIds.add(week.id);
                    }
                });
                const filteredWeeks = data.filter(week => userWeekIds.has(week.id));
                setWeeks(filteredWeeks);
            } else {
                // Admin sees all weeks
                setWeeks(data);
            }

        } catch (error) {
             toast({
                title: "Error",
                description: "No se pudieron cargar las semanas.",
                variant: "destructive"
            })
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchWeeks();
    }, [refreshSignal, user]);

    if (loading) {
        return (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-5/6" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        );
    }
    
    if (weeks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed rounded-lg">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold">No hay semanas para mostrar</h2>
                    {user?.role === 'Administrador' ? (
                         <p className="text-muted-foreground mt-2">Utilice el botón "Crear Nueva Semana" para empezar.</p>
                    ) : (
                         <p className="text-muted-foreground mt-2">No estás asignado a ninguna semana o no hay semanas creadas.</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {weeks.map((week) => (
                <Card key={week.id} className="flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <CardTitle className="font-headline text-xl">{week.name}</CardTitle>
                            <Badge variant="secondary">{week.firehouse}</Badge>
                        </div>
                        <CardDescription>
                            {format(new Date(week.periodStartDate), "dd 'de' LLL", { locale: es })} - {format(new Date(week.periodEndDate), "dd 'de' LLL, yyyy", { locale: es })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground"/>
                            <span className="font-medium">Encargado:</span>
                            <span className="text-muted-foreground">{week.lead?.lastName || 'N/A'}</span>
                        </div>
                         <div className="flex items-center gap-2 text-sm">
                            <Truck className="h-4 w-4 text-muted-foreground"/>
                            <span className="font-medium">Chofer:</span>
                            <span className="text-muted-foreground">{week.driver?.lastName || 'N/A'}</span>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full" variant="outline">
                            <Link href={`/weeks/${week.id}`}>
                                Ver Detalles <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}
