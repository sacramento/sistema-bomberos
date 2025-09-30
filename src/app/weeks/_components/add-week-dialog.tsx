'use client';

import { useEffect, useState, useMemo } from "react";
import { Week } from "@/lib/types";
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
import { usePathname } from "next/navigation";

interface WeekListProps {
    weeks: Week[];
    isLoading?: boolean;
}

export default function WeekList({ weeks, isLoading }: WeekListProps) {
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);

    if (isLoading) {
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
    
    // Filter weeks for non-admin/non-oficial users
    const filteredWeeks = useMemo(() => {
        if (!user || activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Oficial') {
            return weeks;
        }
        return weeks.filter(week => 
            week.allMembers?.some(member => member.legajo === user.id)
        );
    }, [weeks, user, activeRole]);
    
    if (filteredWeeks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">No hay semanas para mostrar</h2>
                     <p className="text-muted-foreground mt-2">
                        {user && (activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Oficial')
                         ? 'Cree una nueva semana para comenzar.'
                         : 'No estás asignado a ninguna semana en esta categoría.'
                        }
                    </p>
                </div>
            </div>
        );
    }


    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredWeeks.map((week) => (
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