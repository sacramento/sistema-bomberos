
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { Week, Vehicle, Material, DutyCheckItem, LoggedInUser, DutyCheckStatus } from "@/lib/types";
import { getWeeks } from "@/services/weeks.service";
import { getVehicles } from "@/services/vehicles.service";
import { getMaterials } from "@/services/materials.service";
import { addDutyCheck } from "@/services/duty-checks.service";
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

export default function AddDutyCheckDialog({ children, onCheckAdded, actor }: { children: React.ReactNode, onCheckAdded: () => void, actor: LoggedInUser }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    
    // Selection Sources
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);

    // Form State
    const [selectedWeekId, setSelectedWeekId] = useState('');
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [vehicleChecks, setVehicleChecks] = useState<DutyCheckItem[]>(
        VEHICLE_BASE_CHECKS.map(name => ({ id: name, name, status: 'OK' }))
    );
    const [equipmentChecks, setEquipmentChecks] = useState<(DutyCheckItem & { materialId: string, materialCode?: string })[]>([]);

    useEffect(() => {
        if (open) {
            setLoading(true);
            Promise.all([getWeeks(), getVehicles(), getMaterials()])
                .then(([w, v, m]) => {
                    setWeeks(w.slice(0, 10)); // Last 10 weeks
                    setVehicles(v);
                    setMaterials(m);
                })
                .finally(() => setLoading(false));
        }
    }, [open]);

    const selectedWeek = useMemo(() => weeks.find(w => w.id === selectedWeekId), [weeks, selectedWeekId]);
    const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);

    const loadEquipment = () => {
        if (!selectedVehicleId) return;
        const checkable = materials.filter(m => {
            const isAssigned = m.ubicacion.type === 'vehiculo' && m.ubicacion.vehiculoId === selectedVehicleId;
            const isCritical = CHECKABLE_CATEGORY_CODES.some(code => m.itemTypeId.startsWith(code) || m.subCategoryId.startsWith(code));
            return isAssigned && isCritical;
        });

        setEquipmentChecks(checkable.map(m => ({
            id: m.id,
            materialId: m.id,
            materialCode: m.codigo,
            name: m.nombre,
            status: 'OK'
        })));
    };

    const handleNext = () => {
        if (step === 1 && (!selectedWeekId || !selectedVehicleId)) {
            toast({ title: "Faltan datos", description: "Seleccione semana y móvil.", variant: "destructive" });
            return;
        }
        if (step === 1) loadEquipment();
        setStep(s => s + 1);
    };

    const updateCheckStatus = (list: any[], id: string, status: DutyCheckStatus, setFn: any) => {
        setFn(list.map(item => item.id === id ? { ...item, status } : item));
    };

    const updateCheckObs = (list: any[], id: string, observations: string, setFn: any) => {
        setFn(list.map(item => item.id === id ? { ...item, observations } : item));
    };

    const handleSubmit = async () => {
        if (!actor || !selectedWeek) return;
        setLoading(true);
        try {
            const data = {
                weekId: selectedWeekId,
                vehicleId: selectedVehicleId,
                inspectorId: actor.id,
                inspectorName: actor.name,
                cuartel: selectedWeek.firehouse,
                date: checkDate,
                vehicleChecks,
                equipmentChecks
            };
            await addDutyCheck(data, actor);
            toast({ title: "¡Éxito!", description: "Control de guardia registrado." });
            onCheckAdded();
            setOpen(false);
            setStep(1);
        } catch (error) {
            toast({ title: "Error", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const renderItem = (item: any, setFn: any, list: any[]) => (
        <div key={item.id} className="p-4 border rounded-lg bg-card space-y-3">
            <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">{item.name} {item.materialCode && <span className="text-[10px] text-muted-foreground font-mono ml-2">[{item.materialCode}]</span>}</span>
                <RadioGroup 
                    value={item.status} 
                    onValueChange={(v) => updateCheckStatus(list, item.id, v as DutyCheckStatus, setFn)}
                    className="flex gap-2"
                >
                    <div className={cn("flex items-center gap-1 border rounded-md px-2 py-1 cursor-pointer transition-colors", item.status === 'OK' ? "bg-green-600 text-white" : "hover:bg-muted")}>
                        <RadioGroupItem value="OK" id={`ok-${item.id}`} className="hidden" />
                        <Label htmlFor={`ok-${item.id}`} className="cursor-pointer text-[10px] font-bold">OK</Label>
                    </div>
                    <div className={cn("flex items-center gap-1 border rounded-md px-2 py-1 cursor-pointer transition-colors", item.status === 'FALLA' ? "bg-red-600 text-white" : "hover:bg-muted")}>
                        <RadioGroupItem value="FALLA" id={`falla-${item.id}`} className="hidden" />
                        <Label htmlFor={`falla-${item.id}`} className="cursor-pointer text-[10px] font-bold">FALLA</Label>
                    </div>
                </RadioGroup>
            </div>
            {item.status === 'FALLA' && (
                <Textarea 
                    placeholder="Describa la falla o novedad..." 
                    className="text-xs h-20 border-red-200 focus-visible:ring-red-500"
                    value={item.observations || ''}
                    onChange={(e) => updateCheckObs(list, item.id, e.target.value, setFn)}
                    required
                />
            )}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="font-headline flex items-center gap-2 text-xl">
                        <ClipboardList className="h-6 w-6 text-primary" /> Nuevo Control de Guardia
                    </DialogTitle>
                    <DialogDescription>Paso {step} de 4 - {['Selección', 'Chequeo Camión', 'Chequeo Equipos', 'Resumen'][step-1]}</DialogDescription>
                    <Progress value={(step / 4) * 100} className="mt-4" />
                </DialogHeader>

                <ScrollArea className="flex-grow px-6 py-4">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label>Seleccionar Semana</Label>
                                <Select value={selectedWeekId} onValueChange={setSelectedWeekId}>
                                    <SelectTrigger><SelectValue placeholder="Semana..." /></SelectTrigger>
                                    <SelectContent>
                                        {weeks.map(w => <SelectItem key={w.id} value={w.id}>{w.name} ({w.firehouse})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Móvil a Controlar</Label>
                                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                                    <SelectTrigger><SelectValue placeholder="Móvil..." /></SelectTrigger>
                                    <SelectContent>
                                        {vehicles.map(v => <SelectItem key={v.id} value={v.id}>Móvil {v.numeroMovil} - {v.marca}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha del Control</Label>
                                <Input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="font-bold flex items-center gap-2"><Truck className="h-4 w-4" /> Operatividad del Móvil</h3>
                            <Separator />
                            <div className="grid grid-cols-1 gap-3">
                                {vehicleChecks.map(item => renderItem(item, setVehicleChecks, vehicleChecks))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <h3 className="font-bold flex items-center gap-2"><Package className="h-4 w-4" /> Equipamiento Crítico</h3>
                            <p className="text-[10px] text-muted-foreground">Listado generado dinámicamente según materiales asignados al móvil.</p>
                            <Separator />
                            {equipmentChecks.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3">
                                    {equipmentChecks.map(item => renderItem(item, setEquipmentChecks, equipmentChecks))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground italic">No se encontraron materiales críticos asignados a este móvil para controlar.</div>
                            )}
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6">
                            <Card className="bg-muted/30 p-4 space-y-2">
                                <p><strong>Móvil:</strong> {selectedVehicle?.numeroMovil}</p>
                                <p><strong>Cuartel:</strong> {selectedWeek?.firehouse}</p>
                                <p><strong>Responsable:</strong> {actor?.name}</p>
                            </Card>
                            <div className="grid grid-cols-2 gap-4">
                                <Card className="p-3">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Móvil</Label>
                                    <div className="text-2xl font-bold flex items-center gap-2">
                                        {vehicleChecks.filter(c => c.status === 'FALLA').length > 0 ? <AlertTriangle className="text-red-500" /> : <CheckCircle2 className="text-green-500" />}
                                        {vehicleChecks.filter(c => c.status === 'FALLA').length} Fallas
                                    </div>
                                </Card>
                                <Card className="p-3">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Equipos</Label>
                                    <div className="text-2xl font-bold flex items-center gap-2">
                                        {equipmentChecks.filter(c => c.status === 'FALLA').length > 0 ? <AlertTriangle className="text-red-500" /> : <CheckCircle2 className="text-green-500" />}
                                        {equipmentChecks.filter(c => c.status === 'FALLA').length} Fallas
                                    </div>
                                </Card>
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
                            <Button onClick={handleSubmit} disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
                                Guardar Control
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
