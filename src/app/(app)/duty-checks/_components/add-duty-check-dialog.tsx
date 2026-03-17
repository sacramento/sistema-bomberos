'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Week, Vehicle, Material, DutyCheckItem, LoggedInUser, DutyCheckStatus, DutyCheck } from "@/lib/types";
import { getWeeks } from "@/services/weeks.service";
import { getVehicles } from "@/services/vehicles.service";
import { getMaterials } from "@/services/materials.service";
import { addDutyChecksBatch } from "@/services/duty-checks.service";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Save, ClipboardList, Truck, Package } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

// Categorías técnicas que disparan el chequeo dinámico
const CHECKABLE_CATEGORY_CODES = [
    '08.3.1', // Motobombas
    '06.3.1', // Grupos Electrógenos
    '08.1.1', // Motosierras
    '08.1.2', // Motodiscos
    '03.1',   // Herramientas Hidráulicas
    '06.1',   // Linternas / Iluminación
    '09.1',   // Comunicaciones VHF (Handies y Bases)
    '01.5',   // Equipos ERA (Aire)
    '01.6.1', // Alarma PASS
    '05.4.3', // DEA
    '05.2.1', // Oxígeno
    '08.4'    // Equipos a Batería / Eléctricos
];

// Ítems base de inspección del vehículo
const VEHICLE_BASE_CHECKS = [
    "Encendido Motor", 
    "Encastre Bomba", 
    "Tanque de Agua (Lleno)", 
    "Nivel Combustible",
    "Nivel Aceite Motor",
    "Sirena",
    "Balizas (Emergencia)", 
    "Luces de Posición", 
    "Luces de Stop (Freno)", 
    "Luces de Reversa",
    "Luces de Giro (Guiños)",
    "Luces Altas",
    "Luces Bajas"
];

type VehicleCheckState = {
    vehicleId: string;
    numeroMovil: string;
    vehicleChecks: DutyCheckItem[];
    equipmentChecks: (DutyCheckItem & { materialId: string, materialCode?: string })[];
};

export default function AddDutyCheckDialog({ children, onCheckAdded, actor }: { children: React.ReactNode, onCheckAdded: () => void, actor: LoggedInUser }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); 
    
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
    const [allMaterials, setAllMaterials] = useState<Material[]>([]);

    const [selectedWeekId, setSelectedWeekId] = useState('');
    const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [targetVehicles, setTargetVehicles] = useState<Vehicle[]>([]);
    const [currentVehicleIndex, setCurrentVehicleIndex] = useState(0);
    const [vehicleStates, setVehicleCheckStates] = useState<VehicleCheckState[]>([]);

    useEffect(() => {
        if (open) {
            setLoading(true);
            Promise.all([getWeeks(), getVehicles(), getMaterials()])
                .then(([w, v, m]) => {
                    setWeeks(w.slice(0, 10)); // Solo las últimas 10 semanas
                    setAllVehicles(v);
                    setAllMaterials(m);
                })
                .finally(() => setLoading(false));
        }
    }, [open]);

    const selectedWeek = useMemo(() => weeks.find(w => w.id === selectedWeekId), [weeks, selectedWeekId]);

    const initializeCheckStates = useCallback((vList: Vehicle[]) => {
        const states: VehicleCheckState[] = vList.map(v => {
            const vMaterials = allMaterials.filter(m => {
                const isAssigned = m.ubicacion.type === 'vehiculo' && m.ubicacion.vehiculoId === v.id;
                const isCritical = CHECKABLE_CATEGORY_CODES.some(code => 
                    m.itemTypeId.startsWith(code) || m.subCategoryId.startsWith(code) || m.categoryId === code
                );
                return isAssigned && isCritical;
            });

            return {
                vehicleId: v.id,
                numeroMovil: v.numeroMovil,
                vehicleChecks: VEHICLE_BASE_CHECKS.map(name => ({ id: name, name, status: 'OK' as DutyCheckStatus })),
                equipmentChecks: vMaterials.map(m => ({
                    id: m.id,
                    materialId: m.id,
                    materialCode: m.codigo,
                    name: m.nombre,
                    status: 'OK' as DutyCheckStatus
                }))
            };
        });
        setVehicleCheckStates(states);
    }, [allMaterials]);

    const handleNext = () => {
        if (step === 1) {
            if (!selectedWeekId) {
                toast({ title: "Falta semana", description: "Seleccione una semana de guardia.", variant: "destructive" });
                return;
            }
            const filtered = allVehicles.filter(v => v.cuartel === selectedWeek?.firehouse && v.status === 'Operativo');
            if (filtered.length === 0) {
                toast({ title: "Sin móviles", description: "No hay móviles operativos en este cuartel.", variant: "destructive" });
                return;
            }
            setTargetVehicles(filtered);
            initializeCheckStates(filtered);
            setStep(2);
            setCurrentVehicleIndex(0);
            return;
        }

        if (step === 2) {
            setStep(3);
            return;
        }

        if (step === 3) {
            if (currentVehicleIndex < targetVehicles.length - 1) {
                setCurrentVehicleIndex(idx => idx + 1);
                setStep(2);
            } else {
                setStep(4);
            }
            return;
        }
    };

    const handleBack = () => {
        if (step === 2) {
            if (currentVehicleIndex > 0) {
                setCurrentVehicleIndex(idx => idx - 1);
                setStep(3);
            } else {
                setStep(1);
            }
            return;
        }
        if (step === 3) {
            setStep(2);
            return;
        }
        if (step === 4) {
            setCurrentVehicleIndex(targetVehicles.length - 1);
            setStep(3);
            return;
        }
        setStep(s => Math.max(s - 1, 1));
    };

    const updateCheckStatus = (type: 'vehicle' | 'equipment', itemId: string, status: DutyCheckStatus) => {
        setVehicleCheckStates(prev => {
            const newStates = [...prev];
            const current = newStates[currentVehicleIndex];
            if (type === 'vehicle') {
                current.vehicleChecks = current.vehicleChecks.map(i => i.id === itemId ? { ...i, status } : i);
            } else {
                current.equipmentChecks = current.equipmentChecks.map(i => i.id === itemId ? { ...i, status } : i);
            }
            return newStates;
        });
    };

    const updateCheckObs = (type: 'vehicle' | 'equipment', itemId: string, observations: string) => {
        setVehicleCheckStates(prev => {
            const newStates = [...prev];
            const current = newStates[currentVehicleIndex];
            if (type === 'vehicle') {
                current.vehicleChecks = current.vehicleChecks.map(i => i.id === itemId ? { ...i, observations } : i);
            } else {
                current.equipmentChecks = current.equipmentChecks.map(i => i.id === itemId ? { ...i, observations } : i);
            }
            return newStates;
        });
    };

    const handleSubmit = async () => {
        if (!actor || !selectedWeek || vehicleStates.length === 0) return;
        setLoading(true);
        try {
            const batchData: Omit<DutyCheck, 'id'>[] = vehicleStates.map(state => ({
                weekId: selectedWeekId,
                vehicleId: state.numeroMovil,
                inspectorId: actor.id,
                inspectorName: actor.name,
                cuartel: selectedWeek.firehouse as any,
                date: checkDate,
                vehicleChecks: state.vehicleChecks,
                equipmentChecks: state.equipmentChecks
            }));

            await addDutyChecksBatch(batchData, actor);
            toast({ title: "¡Éxito!", description: `Se registraron los controles de la dotación.` });
            onCheckAdded();
            setOpen(false);
            resetForm();
        } catch (error) {
            toast({ title: "Error", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setSelectedWeekId('');
        setTargetVehicles([]);
        setCurrentVehicleIndex(0);
        setVehicleCheckStates([]);
    }

    const currentVehicle = targetVehicles[currentVehicleIndex];
    const currentState = vehicleStates[currentVehicleIndex];

    const renderItem = (item: any, type: 'vehicle' | 'equipment') => (
        <div key={`${currentVehicleIndex}-${item.id}`} className="p-4 border rounded-lg bg-card space-y-3 shadow-sm">
            <div className="flex justify-between items-center gap-2">
                <span className="font-semibold text-sm flex-grow">{item.name} {item.materialCode && <Badge variant="outline" className="ml-2 font-mono text-[10px]">{item.materialCode}</Badge>}</span>
                <RadioGroup 
                    value={item.status} 
                    onValueChange={(v) => updateCheckStatus(type, item.id, v as DutyCheckStatus)}
                    className="flex gap-2"
                >
                    <div className={cn("flex items-center gap-1 border rounded-md px-3 py-1 cursor-pointer transition-colors", item.status === 'OK' ? "bg-green-600 text-white border-green-600" : "hover:bg-muted")}>
                        <RadioGroupItem value="OK" id={`ok-${item.id}-${currentVehicleIndex}`} className="hidden" />
                        <Label htmlFor={`ok-${item.id}-${currentVehicleIndex}`} className="cursor-pointer text-[10px] font-bold uppercase">OK</Label>
                    </div>
                    <div className={cn("flex items-center gap-1 border rounded-md px-3 py-1 cursor-pointer transition-colors", item.status === 'FALLA' ? "bg-red-600 text-white border-red-600" : "hover:bg-muted")}>
                        <RadioGroupItem value="FALLA" id={`falla-${item.id}-${currentVehicleIndex}`} className="hidden" />
                        <Label htmlFor={`falla-${item.id}-${currentVehicleIndex}`} className="cursor-pointer text-[10px] font-bold uppercase">FALLA</Label>
                    </div>
                </RadioGroup>
            </div>
            {item.status === 'FALLA' && (
                <div className="animate-in fade-in slide-in-from-top-1">
                    <Textarea 
                        placeholder="Describa la falla o novedad obligatoriamente..." 
                        className="text-xs h-20 border-red-200 focus-visible:ring-red-500"
                        value={item.observations || ''}
                        onChange={(e) => updateCheckObs(type, item.id, e.target.value)}
                        required
                    />
                </div>
            )}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if(!isOpen) resetForm(); }}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 border-b bg-muted/10">
                    <DialogTitle className="font-headline flex items-center gap-2 text-xl">
                        <ClipboardList className="h-6 w-6 text-primary" /> Control de Guardia
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1 ? 'Seleccione la guardia y fecha para iniciar.' : `Móvil ${currentVehicle?.numeroMovil} (${currentVehicleIndex + 1} de ${targetVehicles.length})`}
                    </DialogDescription>
                    {step > 1 && (
                        <div className="space-y-2 mt-4">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                                <span>Progreso de Dotación</span>
                                <span>{Math.round(((currentVehicleIndex + (step === 4 ? 1 : 0)) / (targetVehicles.length || 1)) * 100)}%</span>
                            </div>
                            <Progress value={((currentVehicleIndex + (step === 4 ? 1 : 0)) / (targetVehicles.length || 1)) * 100} className="h-1.5" />
                        </div>
                    )}
                </DialogHeader>

                <ScrollArea className="flex-grow">
                    <div className="px-6 py-6 space-y-6">
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="space-y-2">
                                    <Label>Semana de Guardia</Label>
                                    <Select value={selectedWeekId} onValueChange={setSelectedWeekId}>
                                        <SelectTrigger className="h-12"><SelectValue placeholder="Seleccionar semana..." /></SelectTrigger>
                                        <SelectContent>
                                            {weeks.map(w => <SelectItem key={w.id} value={w.id}>{w.name} ({w.firehouse})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {selectedWeek && <p className="text-xs text-primary font-bold mt-2">✓ Se inspeccionarán {allVehicles.filter(v => v.cuartel === selectedWeek.firehouse && v.status === 'Operativo').length} móviles operativos en {selectedWeek.firehouse}.</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Fecha del Control</Label>
                                    <Input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)} className="h-12" />
                                </div>
                            </div>
                        )}

                        {step === 2 && currentState && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                <div className="flex items-center justify-between sticky top-0 bg-background/95 py-2 z-10 backdrop-blur-sm">
                                    <h3 className="font-bold flex items-center gap-2 text-primary"><Truck className="h-5 w-5" /> Móvil {currentVehicle?.numeroMovil} - Luces y Sistemas</h3>
                                    <Badge variant="outline">PARTE 1/2</Badge>
                                </div>
                                <div className="grid grid-cols-1 gap-3 pb-4">
                                    {currentState.vehicleChecks.map(item => renderItem(item, 'vehicle'))}
                                </div>
                            </div>
                        )}

                        {step === 3 && currentState && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                <div className="flex items-center justify-between sticky top-0 bg-background/95 py-2 z-10 backdrop-blur-sm">
                                    <h3 className="font-bold flex items-center gap-2 text-primary"><Package className="h-5 w-5" /> Móvil {currentVehicle?.numeroMovil} - Equipamiento</h3>
                                    <Badge variant="outline">PARTE 2/2</Badge>
                                </div>
                                {currentState.equipmentChecks.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3 pb-4">
                                        {currentState.equipmentChecks.map(item => renderItem(item, 'equipment'))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16 text-muted-foreground italic bg-muted/20 rounded-lg border-2 border-dashed">
                                        No se detectó equipamiento crítico (motores, radios, linternas, etc.) asignado a este móvil en el inventario.
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-6 animate-in zoom-in-95 duration-300">
                                <Card className="bg-primary/5 p-6 space-y-2 border-primary/20">
                                    <h3 className="font-bold text-xl text-primary">Resumen Final</h3>
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Cuartel</p>
                                            <p className="font-semibold text-sm">{selectedWeek?.firehouse}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Responsable</p>
                                            <p className="font-semibold text-sm">{actor?.name}</p>
                                        </div>
                                    </div>
                                </Card>
                                <div className="space-y-3">
                                    <Label className="text-xs uppercase font-bold">Estado de la Dotación</Label>
                                    {vehicleStates.map((state) => {
                                        const vFails = state.vehicleChecks.filter(c => c.status === 'FALLA').length;
                                        const eFails = state.equipmentChecks.filter(c => c.status === 'FALLA').length;
                                        const totalFails = vFails + eFails;
                                        return (
                                            <div key={state.vehicleId} className="flex items-center justify-between p-4 border rounded-xl bg-card shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">{state.numeroMovil}</div>
                                                    <span className="font-bold text-sm">Móvil {state.numeroMovil}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {totalFails > 0 ? (
                                                        <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3"/> {totalFails} Novedades</Badge>
                                                    ) : (
                                                        <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3"/> Sin novedades</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 border-t bg-muted/10 shadow-inner">
                    <div className="flex justify-between w-full">
                        <Button variant="ghost" onClick={handleBack} disabled={step === 1 || loading}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
                        </Button>
                        {step < 4 ? (
                            <Button onClick={handleNext} disabled={loading} size="lg">
                                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={loading} size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
                                Finalizar Control
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
