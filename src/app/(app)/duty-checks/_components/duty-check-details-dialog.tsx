
'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DutyCheck, DutyCheckItem } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, AlertTriangle, User, Calendar, Truck, Package } from "lucide-react";

export default function DutyCheckDetailsDialog({ check, open, onOpenChange }: { check: DutyCheck | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    if (!check) return null;

    const renderItem = (item: DutyCheckItem & { materialCode?: string }) => (
        <div key={item.id} className="p-3 border rounded-md flex flex-col gap-2 bg-card">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <p className="font-semibold text-sm">{item.name}</p>
                    {item.materialCode && <p className="font-mono text-[10px] text-muted-foreground">Cód: {item.materialCode}</p>}
                </div>
                <Badge variant={item.status === 'OK' ? 'default' : 'destructive'} className={item.status === 'OK' ? 'bg-green-600' : ''}>
                    {item.status}
                </Badge>
            </div>
            {item.observations && (
                <p className="text-xs italic bg-muted p-2 rounded border-l-2 border-red-500">
                    "{item.observations}"
                </p>
            )}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline text-xl">Detalle de Control</DialogTitle>
                    <DialogDescription>Realizado por {check.inspectorName}</DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-4 text-xs mt-2">
                    <div className="flex items-center gap-2"><Calendar className="h-3 w-3 text-primary" /> {format(parseISO(check.date), 'PPP', { locale: es })}</div>
                    <div className="flex items-center gap-2"><Truck className="h-3 w-3 text-primary" /> Móvil ID: {check.vehicleId}</div>
                </div>

                <Separator className="my-4" />

                <ScrollArea className="flex-grow pr-4">
                    <div className="space-y-6 pb-4">
                        <section className="space-y-3">
                            <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <Truck className="h-3 w-3" /> Estado del Camión
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {check.vehicleChecks.map(renderItem)}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <Package className="h-3 w-3" /> Estado de Equipos
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {check.equipmentChecks.length > 0 ? 
                                    check.equipmentChecks.map(renderItem) : 
                                    <p className="text-xs italic text-center py-4">No se controlaron materiales.</p>
                                }
                            </div>
                        </section>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
