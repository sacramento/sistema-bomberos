
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Week, Firefighter } from "@/lib/types";
import { getWeeks } from "@/services/weeks.service";
import { useEffect, useState, useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
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
        fetchWeeks();
    }, [toast]);
    
    const currentMonthWeeks = useMemo(() => {
        const today = new Date();
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        
        return weeks
            .filter(week => {
                const weekStart = parseISO(week.periodStartDate);
                // Check if any part of the week falls within the current month
                return isWithinInterval(weekStart, { start, end });
            })
            .sort((a,b) => parseISO(a.periodStartDate).getTime() - parseISO(b.periodStartDate).getTime());
    }, [weeks]);

    const weeksByFirehouse = useMemo(() => {
        return currentMonthWeeks.reduce((acc, week) => {
            const firehouse = week.firehouse || 'Sin Cuartel';
            if (!acc[firehouse]) {
                acc[firehouse] = [];
            }
            acc[firehouse].push(week);
            return acc;
        }, {} as Record<string, Week[]>);
    }, [currentMonthWeeks]);

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
                    <p>No hay semanas programadas para este cuartel en el mes actual.</p>
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
                                        {format(parseISO(week.periodStartDate), "dd/MM")} - {format(parseISO(week.periodEndDate), "dd/MM/yyyy")}
                                    </p>
                                 </div>
                                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="h-4 w-4 text-muted-foreground"/>
                                        <p><span className="font-medium">Enc:</span> {week.lead?.lastName || 'N/A'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Truck className="h-4 w-4 text-muted-foreground"/>
                                         <p><span className="font-medium">Chofer:</span> {week.driver?.lastName || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                            <Accordion type="single" collapsible className="w-full mt-2">
                              <AccordionItem value="item-1">
                                <AccordionTrigger>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Users2 className="h-4 w-4 text-muted-foreground" />
                                    <span>{week.allMembers?.length || 0} Integrantes</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="flex flex-wrap gap-2 pt-2">
                                    {week.members?.map(member => (
                                        <Badge key={member.id} variant="outline">{member.lastName}</Badge>
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
                title="Listado Mensual de Semanas"
                description={`Resumen de las semanas planificadas para ${format(new Date(), 'MMMM yyyy', { locale: es })}.`}
            />
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
