
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Week } from "@/lib/types";
import { getWeeks } from "@/services/weeks.service";
import { useEffect, useState, useMemo } from "react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { User, Truck, Users2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge";

const getBorderColor = (firehouse: Week['firehouse']) => {
    switch (firehouse) {
        case 'Cuartel 1': return 'border-yellow-500';
        case 'Cuartel 2': return 'border-blue-500';
        case 'Cuartel 3': return 'border-orange-500';
        default: return 'border-gray-500';
    }
};

export default function WeeksListPage() {
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchWeeks = async () => {
            setLoading(true);
            try {
                const data = await getWeeks();
                setWeeks(data); // Fetches all weeks, already sorted by date desc
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
        fetchWeeks();
    }, [toast]);
    
    const activeWeeksSummary = useMemo(() => {
        const today = new Date();
        const activeWeeksByFirehouse: Record<string, string> = {
            'Cuartel 1': 'Ninguna',
            'Cuartel 2': 'Ninguna',
            'Cuartel 3': 'Ninguna'
        };

        weeks.forEach(week => {
            const startDate = startOfDay(parseISO(week.periodStartDate));
            const endDate = endOfDay(parseISO(week.periodEndDate));
            
            if (isWithinInterval(today, { start: startDate, end: endDate })) {
                if (activeWeeksByFirehouse.hasOwnProperty(week.firehouse)) {
                    activeWeeksByFirehouse[week.firehouse] = week.name;
                }
            }
        });
        return activeWeeksByFirehouse;
    }, [weeks]);

    const weeksByFirehouse = useMemo(() => {
        return weeks.reduce((acc, week) => {
            const firehouse = week.firehouse || 'Sin Cuartel';
            if (!acc[firehouse]) {
                acc[firehouse] = [];
            }
            acc[firehouse].push(week);
            return acc;
        }, {} as Record<string, Week[]>);
    }, [weeks]);

    const firehouseOrder = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

    const renderWeekCards = (weekList: Week[]) => {
        if (loading) {
            return (
                <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, index) => (
                        <Card key={index} className="shadow-sm">
                            <CardContent className="p-4">
                                <Skeleton className="h-5 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            );
        }

        if (weekList.length === 0) {
            return (
                <div className="text-center py-8 text-muted-foreground">
                    <p>No hay semanas programadas para este cuartel.</p>
                </div>
            );
        }

        return (
             <div className="space-y-4">
                {weekList.map(week => (
                    <Card key={week.id} className={cn("border-l-4 shadow-sm", getBorderColor(week.firehouse))}>
                       <div className="p-4">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                                 <div>
                                     <h3 className="font-headline text-lg font-semibold">{week.name}</h3>
                                     <p className="text-sm text-muted-foreground">
                                        {format(parseISO(week.periodStartDate), "dd/MM/yy")} - {format(parseISO(week.periodEndDate), "dd/MM/yy")}
                                    </p>
                                 </div>
                                <div className="flex items-center gap-4 mt-2 sm:mt-0 text-sm">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground"/>
                                        <p><span className="font-medium">Enc:</span> {week.lead?.lastName || 'N/A'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-muted-foreground"/>
                                         <p><span className="font-medium">Chofer:</span> {week.driver?.lastName || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                            <Accordion type="single" collapsible className="w-full mt-2">
                              <AccordionItem value="item-1" className="border-none">
                                <AccordionTrigger className="py-1">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Users2 className="h-4 w-4 text-muted-foreground" />
                                    <span>{week.allMembers?.length || 0} Integrantes</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="flex flex-wrap gap-1 pt-2">
                                    {week.members?.map(member => (
                                        <Badge key={member.id} variant="outline" className="font-normal">{member.lastName}</Badge>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                       </div>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <>
            <PageHeader
                title="Listado Histórico de Semanas"
                description="Registro completo de todas las semanas de guardia, agrupadas por cuartel."
            />
            
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="font-headline">Semanas Activas Actualmente</CardTitle>
                    <CardDescription>Resumen de las semanas de guardia en curso.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                    {Object.entries(activeWeeksSummary).map(([firehouse, weekName]) => (
                        <div key={firehouse} className="flex justify-between items-center p-2 rounded-md even:bg-muted/50">
                            <span className="font-medium text-muted-foreground">{firehouse}:</span>
                            <span className="font-semibold">{weekName}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="space-y-8">
                {firehouseOrder.map(firehouse => (
                    <div key={firehouse}>
                        <h2 className="font-headline text-2xl font-semibold tracking-tight border-b pb-2 mb-4">{firehouse}</h2>
                        {renderWeekCards(weeksByFirehouse[firehouse] || [])}
                    </div>
                ))}
            </div>
        </>
    );
}
