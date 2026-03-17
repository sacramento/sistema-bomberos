'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DutyCheck, DutyCheckItem } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Truck, Package } from "lucide-react";

export default function DutyCheckDetailsDialog({ check, open, onOpenChange }: { check: DutyCheck | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    if (!check) return null;

    const renderItem = (item: DutyCheckItem & { materialCode?: string, uniqueId: string }) => (
        <div key={item.uniqueId} className="p-3 border rounded-md flex flex-col gap-2 bg-card">
            <div className="flex justify-between items-start gap-2">
                <div className="space-y-1">
                    <p className="font-semibold text-sm">{item.name}</p>
                    {item.materialCode && <p className="font-mono text-[10px] text-muted-foreground">Cód: {item.materialCode}</p>}
                </div>
                <Badge variant={item.status === 'OK' ? 'default' : 'destructive'} className={item.status === 'OK' ? 'bg-green-600 text-white' : ''}>
                    {item.status}
                </Badge>
            </div>
            {item.observations && (
                <p className="text-xs italic bg-red-50 text-red-900 p-2 rounded border-l-2 border-red-500">
                    "{item.observations}"
                </p>
            )}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline text-xl">Detalle de Inspección de Dotación</DialogTitle>
                    <DialogDescription>
                        Informe consolidado del {format(parseISO(check.date), 'PPPP', { locale: es })}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-4 text-xs mt-2 bg-muted/30 p-3 rounded-lg border">
                    <div className="flex items-center gap-2 font-medium"><Calendar className="h-3 w-3 text-primary" /> {format(parseISO(check.date), 'dd/MM/yyyy')}</div>
                    <div className="flex items-center gap-2 font-medium"><Truck className="h-3 w-3 text-primary" /> Móviles: {check.vehicleId}</div>
                </div>

                <Separator className="my-4" />

                <ScrollArea className="flex-grow pr-4">
                    <div className="space-y-8 pb-6">
                        <section className="space-y-4">
                            <h4 className="text-xs font-black uppercase text-primary flex items-center gap-2 tracking-widest">
                                <Truck className="h-4 w-4" /> Estado de Vehículos (Luces y Sistemas)
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {check.vehicleChecks.map((item, idx) => renderItem({ ...item, uniqueId: `v-${idx}-${item.id}` }))}
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h4 className="text-xs font-black uppercase text-primary flex items-center gap-2 tracking-widest">
                                <Package className="h-4 w-4" /> Equipamiento Crítico
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {check.equipmentChecks.length > 0 ? 
                                    check.equipmentChecks.map((item, idx) => renderItem({ ...item, uniqueId: `e-${idx}-${item.id}` })) : 
                                    <div className="text-center py-8 text-muted-foreground italic border-2 border-dashed rounded-lg">No se registraron materiales críticos en este control.</div>
                                }
                            </div>
                        </section>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
