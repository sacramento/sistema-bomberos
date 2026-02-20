
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { Material, Specialization, Vehicle } from "@/lib/types";
import { addMaterial, getNextMaterialSequence } from "@/services/materials.service";
import { getVehicles } from "@/services/vehicles.service";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";

const materialTypes: Material['tipo'][] = [
    'BOMBEO', 'COMUNICACION', 'DOCUMENTACION', 'ESTABILIZACION', 'H. CORTE', 
    'H. ELECTRICA', 'H. GOLPE', 'H. HIDRAULICA', 'H. NEUMATICA', 'HERRAMIENTA', 
    'ILUMINACION', 'INMOVILIZACION', 'LANZA', 'LOGISTICA', 'MANGA', 'MEDICION', 
    'MEDICO', 'PROTECCION', 'RESPIRACION', 'TRANSPORTE'
].sort() as Material['tipo'][];

const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'GENERAL'];
const firehouses: Material['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
const estados: Material['estado'][] = ['En Servicio', 'Fuera de Servicio'];
const condiciones: Material['condicion'][] = ['Bueno', 'Regular', 'Malo'];

const vehicleCompartments = [
    'Techo', 'Dotacion', 'Cabina',
    'Baulera 1', 'Baulera 2', 'Baulera 3', 'Baulera 4', 'Baulera 5',
    'Baulera 6', 'Baulera 7', 'Baulera 8', 'Baulera 9', 'Baulera 10'
];

interface AddMaterialDialogProps {
    children?: React.ReactNode;
    onMaterialAdded: () => void;
    initialData?: Material | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function AddMaterialDialog({ children, onMaterialAdded, initialData, open: controlledOpen, onOpenChange: setControlledOpen }: AddMaterialDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [generatingCode, setGeneratingCode] = useState(false);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);

    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;


    // Form state
    const [codigo, setCodigo] = useState('');
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState<Material['tipo'] | ''>('');
    const [especialidad, setEspecialidad] = useState<Specialization | ''>('');
    const [caracteristicas, setCaracteristicas] = useState('');
    const [estado, setEstado] = useState<Material['estado']>('En Servicio');
    const [condicion, setCondicion] = useState<Material['condicion']>('Bueno');
    const [cuartel, setCuartel] = useState<Material['cuartel'] | ''>('');
    const [locationType, setLocationType] = useState<'deposito' | 'vehiculo'>('deposito');
    const [vehiculoId, setVehiculoId] = useState('');
    const [baulera, setBaulera] = useState('');

    const resetForm = useCallback(() => {
        setCodigo(''); setNombre(''); setTipo(''); setEspecialidad(''); setCaracteristicas(''); setEstado('En Servicio'); setCondicion('Bueno'); setCuartel('');
        setLocationType('deposito'); setVehiculoId(''); setBaulera('');
    }, []);

    useEffect(() => {
        if (open) {
            getVehicles().then(setVehicles).catch(() => toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los vehículos." }));
            
            if (initialData) {
                // Pre-fill form for cloning
                setNombre(initialData.nombre);
                setTipo(initialData.tipo);
                setEspecialidad(initialData.especialidad);
                setCaracteristicas(initialData.caracteristicas || '');
                setEstado(initialData.estado);
                setCondicion(initialData.condicion || 'Bueno');
                setCuartel(initialData.cuartel);
                setLocationType(initialData.ubicacion.type);
                setVehiculoId(initialData.ubicacion.vehiculoId || '');
                setBaulera(initialData.ubicacion.baulera || '');
                setCodigo('');
            } else {
                resetForm();
            }
        }
    }, [open, initialData, toast, resetForm]);

    const handleAutoGenerateCode = async () => {
        if (!tipo || !especialidad) {
            toast({ title: "Faltan datos", description: "Seleccione Tipo y Especialidad para generar un código." });
            return;
        }

        setGeneratingCode(true);
        try {
            const cleanType = tipo.replace(/[\s.]/g, '').substring(0, 2).toUpperCase();
            const cleanSpec = especialidad.replace(/[\s.]/g, '').substring(0, 2).toUpperCase();
            const prefix = `${cleanType}${cleanSpec}`;
            
            const sequence = await getNextMaterialSequence(prefix);
            const formattedCode = `${prefix}${sequence.toString().padStart(3, '0')}`;
            
            setCodigo(formattedCode);
            toast({ title: "Código generado", description: `Se ha asignado el código único: ${formattedCode}` });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo generar el código único." });
        } finally {
            setGeneratingCode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const ubicacion = locationType === 'deposito' 
            ? { type: 'deposito' as const, deposito: cuartel as Material['cuartel'] } 
            : { type: 'vehiculo' as const, vehiculoId, baulera };

        if (!codigo || !nombre || !tipo || !especialidad || !estado || !condicion || !cuartel || (locationType === 'vehiculo' && (!vehiculoId || !baulera))) {
            toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor, complete todos los campos requeridos." });
            return;
        }

        setLoading(true);
        try {
            await addMaterial({ codigo, nombre, tipo, especialidad, caracteristicas, estado, ubicacion, cuartel, condicion }, { id: 'admin', name: 'Admin', role: 'Master', roles: { asistencia: 'Administrador', aspirantes: 'Administrador', semanas: 'Administrador', movilidad: 'Administrador', materiales: 'Administrador', ayudantia: 'Administrador', roperia: 'Administrador', servicios: 'Administrador', cascada: 'Administrador' } });
            toast({ title: "¡Éxito!", description: "El material ha sido agregado." });
            onMaterialAdded();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al agregar", description: error.message });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        if (locationType === 'vehiculo' && vehiculoId) {
            const selectedVehicle = vehicles.find(v => v.id === vehiculoId);
            if (selectedVehicle) {
                setCuartel(selectedVehicle.cuartel);
            }
        }
    }, [vehiculoId, vehicles, locationType]);

    const isCloning = !!initialData;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline">{isCloning ? 'Clonar Material' : 'Agregar Nuevo Material'}</DialogTitle>
                    <DialogDescription>
                        {isCloning ? `Complete el código único para clonar "${initialData.nombre}". El resto de los datos han sido copiados.` : 'Complete los detalles del nuevo ítem de inventario.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4 space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="codigo">Código (Único)</Label>
                            <div className="flex gap-2">
                                <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} required placeholder="Ej: REHA001" className="flex-grow font-mono" />
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={handleAutoGenerateCode}
                                    disabled={generatingCode || !tipo || !especialidad}
                                    title="Auto-generar código (3 dígitos)"
                                >
                                    {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="nombre">Nombre</Label><Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required /></div>
                        <div className="space-y-2"><Label>Tipo</Label><Select value={tipo} onValueChange={(v) => setTipo(v as any)}><SelectTrigger><SelectValue placeholder="Seleccionar tipo..."/></SelectTrigger><SelectContent>{materialTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Especialidad</Label><Select value={especialidad} onValueChange={(v) => setEspecialidad(v as any)}><SelectTrigger><SelectValue placeholder="Seleccionar especialidad..." /></SelectTrigger><SelectContent>{specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Estado</Label><Select value={estado} onValueChange={(v) => setEstado(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{estados.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Condición</Label><Select value={condicion} onValueChange={(v) => setCondicion(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{condiciones.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2">
                            <Label>Cuartel</Label>
                            <Select value={cuartel} onValueChange={(v) => setCuartel(v as any)}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar cuartel..." /></SelectTrigger>
                                <SelectContent>{firehouses.map(fh => <SelectItem key={fh} value={fh}>{fh}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label htmlFor="caracteristicas">Características</Label>
                        <Textarea id="caracteristicas" value={caracteristicas} onChange={(e) => setCaracteristicas(e.target.value)} placeholder="Modelo, N/S, vencimiento, etc." />
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                        <Label>Ubicación</Label>
                        <RadioGroup defaultValue="deposito" value={locationType} onValueChange={(v) => setLocationType(v as any)}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="deposito" id="r-deposito" /><Label htmlFor="r-deposito">Depósito</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="vehiculo" id="r-vehiculo" /><Label htmlFor="r-vehiculo">Vehículo</Label></div>
                        </RadioGroup>
                        {locationType === 'vehiculo' && (
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2"><Label>Móvil</Label><Select value={vehiculoId} onValueChange={setVehiculoId}><SelectTrigger><SelectValue placeholder="Seleccionar móvil..." /></SelectTrigger><SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.numeroMovil} - {v.marca}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2">
                                    <Label htmlFor="baulera">Ubicación en Móvil</Label>
                                    <Select value={baulera} onValueChange={setBaulera}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar ubicación..." /></SelectTrigger>
                                        <SelectContent>
                                            {vehicleCompartments.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
                <DialogFooter className="border-t pt-4"><Button onClick={handleSubmit} disabled={loading}>{loading ? "Guardando..." : "Guardar Material"}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
