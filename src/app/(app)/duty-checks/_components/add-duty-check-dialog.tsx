
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

const CHECKABLE_CATEGORY_CODES = [
    '08.3.1', '06.3.1', '08.1.1', '03.1', '06.1.1', '09.1.1', '09.1.2', '01.5', '05.4.3', '05.2.1'
];

const VEHICLE_BASE_CHECKS = [
    "Encendido Motor", "Encastre Bomba", "Nivel Agua", "Nivel Combustible",
    "Balizas", "Sirenas", "Luces Posición", "Luces Stop", "Luces Alta/Baja", "Luces Giro"
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
    const [step, setStep] = useState(1); // 1: Setup, 2: Vehicle Checks, 3: Equipment Checks, 4: Summary
    
    // Selection Sources
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
    const [allMaterials, setAllMaterials] = useState<Material[]>([]);

    // Form State
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
                    setWeeks(w.slice(0, 10)); // Last 10 weeks
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
                const isCritical = CHECKABLE_CATEGORY_CODES.some(code => m.itemTypeId.startsWith(code) || m.subCategoryId.startsWith(code));
                return isAssigned && isCritical;
            });

            return {
                vehicleId: v.id,
                numeroMovil: v.numeroMovil,
                vehicleChecks: VEHICLE_BASE_CHECKS.map(name => ({ id: name, name, status: 'OK' })),
                equipmentChecks: vMaterials.map(m => ({
                    id: m.id,
                    materialId: m.id,
                    materialCode: m.codigo,
                    name: m.nombre,
                    status: 'OK'
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
                vehicleId: state.vehicleId,
                inspectorId: actor.id,
                inspectorName: actor.name,
                cuartel: selectedWeek.firehouse,
                date: checkDate,
                vehicleChecks: state.vehicleChecks,
                equipmentChecks: state.equipmentChecks
            }));

            await addDutyChecksBatch(batchData, actor);
            toast({ title: "¡Éxito!", description: `Se registraron los controles de ${batchData.length} móviles.` });
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
        <div key={item.id} className="p-4 border rounded-lg bg-card space-y-3">
            <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">{item.name} {item.materialCode && <span className="text-[10px] text-muted-foreground font-mono ml-2">[{item.materialCode}]</span>}</span>
                <RadioGroup 
                    value={item.status} 
                    onValueChange={(v) => updateCheckStatus(type, item.id, v as DutyCheckStatus)}
                    className="flex gap-2"
                >
                    <div className={cn("flex items-center gap-1 border rounded-md px-2 py-1 cursor-pointer transition-colors", item.status === 'OK' ? "bg-green-600 text-white" : "hover:bg-muted")}>
                        <RadioGroupItem value="OK" id={`ok-${item.id}`} className="hidden" />
                        <Label htmlFor={`ok-${item.id}`} className="cursor-pointer text-[10px] font-bold uppercase">OK</Label>
                    </div>
                    <div className={cn("flex items-center gap-1 border rounded-md px-2 py-1 cursor-pointer transition-colors", item.status === 'FALLA' ? "bg-red-600 text-white" : "hover:bg-muted")}>
                        <RadioGroupItem value="FALLA" id={`falla-${item.id}`} className="hidden" />
                        <Label htmlFor={`falla-${item.id}`} className="cursor-pointer text-[10px] font-bold uppercase">FALLA</Label>
                    </div>
                </RadioGroup>
            </div>
            {item.status === 'FALLA' && (
                <Textarea 
                    placeholder="Describa la falla o novedad..." 
                    className="text-xs h-20 border-red-200 focus-visible:ring-red-500"
                    value={item.observations || ''}
                    onChange={(e) => updateCheckObs(type, item.id, e.target.value)}
                    required
                />
            )}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if(!isOpen) resetForm(); }}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="font-headline flex items-center gap-2 text-xl">
                        <ClipboardList className="h-6 w-6 text-primary" /> Control de Guardia
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1 ? 'Configure la inspección general.' : `Controlando Móvil ${currentVehicle?.numeroMovil} (${currentVehicleIndex + 1} de ${targetVehicles.length})`}
                    </DialogDescription>
                    <div className="space-y-2 mt-4">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                            <span>Progreso Dotación</span>
                            <span>{Math.round(((currentVehicleIndex + (step === 4 ? 1 : 0)) / (targetVehicles.length || 1)) * 100)}%</span>
                        </div>
                        <Progress value={((currentVehicleIndex + (step === 4 ? 1 : 0)) / (targetVehicles.length || 1)) * 100} className="h-1.5" />
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-grow px-6 py-4">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label>Seleccionar Semana de Guardia</Label>
                                <Select value={selectedWeekId} onValueChange={setSelectedWeekId}>
                                    <SelectTrigger><SelectValue placeholder="Semana..." /></SelectTrigger>
                                    <SelectContent>
                                        {weeks.map(w => <SelectItem key={w.id} value={w.id}>{w.name} ({w.firehouse})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {selectedWeek && <p className="text-xs text-primary font-medium">✓ Se controlarán todos los móviles operativos del {selectedWeek.firehouse}.</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha del Control</Label>
                                <Input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {step === 2 && currentState && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold flex items-center gap-2 text-primary"><Truck className="h-5 w-5" /> Móvil {currentVehicle?.numeroMovil} - Estado General</h3>
                                <Badge variant="outline" className="text-[10px]">PARTE 1/2</Badge>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-1 gap-3">
                                {currentState.vehicleChecks.map(item => renderItem(item, 'vehicle'))}
                            </div>
                        </div>
                    )}

                    {step === 3 && currentState && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold flex items-center gap-2 text-primary"><Package className="h-5 w-5" /> Móvil {currentVehicle?.numeroMovil} - Equipamiento</h3>
                                <Badge variant="outline" className="text-[10px]">PARTE 2/2</Badge>
                            </div>
                            <Separator />
                            {currentState.equipmentChecks.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3">
                                    {currentState.equipmentChecks.map(item => renderItem(item, 'equipment'))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground italic bg-muted/20 rounded-lg border-2 border-dashed">No se encontraron materiales críticos asignados para controlar.</div>
                            )}
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in zoom-in-95 duration-300">
                            <Card className="bg-primary/5 p-4 space-y-2 border-primary/20">
                                <h3 className="font-bold text-lg text-primary">Resumen Final de Dotación</h3>
                                <p className="text-sm"><strong>Cuartel:</strong> {selectedWeek?.firehouse}</p>
                                <p className="text-sm"><strong>Responsable:</strong> {actor?.name}</p>
                            </Card>
                            <div className="space-y-4">
                                {vehicleStates.map((state, idx) => {
                                    const vFails = state.vehicleChecks.filter(c => c.status === 'FALLA').length;
                                    const eFails = state.equipmentChecks.filter(c => c.status === 'FALLA').length;
                                    const totalFails = vFails + eFails;
                                    return (
                                        <div key={state.vehicleId} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs">{state.numeroMovil}</div>
                                                <span className="font-semibold text-sm">Móvil {state.numeroMovil}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {totalFails > 0 ? (
                                                    <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3"/> {totalFails} Fallas</Badge>
                                                ) : (
                                                    <Badge className="bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3"/> Sin novedades</Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="p-6 border-t bg-muted/10">
                    <div className="flex justify-between w-full">
                        <Button variant="ghost" onClick={handleBack} disabled={step === 1 || loading}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
                        </Button>
                        {step < 4 ? (
                            <Button onClick={handleNext} disabled={loading}>
                                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
                                Finalizar y Guardar Dotación
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
