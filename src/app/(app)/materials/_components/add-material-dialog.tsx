
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Material, Specialization, Vehicle } from "@/lib/types";
import { addMaterial } from "@/services/materials.service";
import { getVehicles } from "@/services/vehicles.service";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const materialTypes: Material['tipo'][] = ['Lanza', 'Manga', 'Corte', 'Combustion', 'Hidraulica', 'Golpe'];
const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE', 'VARIOS'];
const firehouses: Material['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
const estados: Material['estado'][] = ['En Servicio', 'Fuera de Servicio'];

export default function AddMaterialDialog({ children, onMaterialAdded }: { children: React.ReactNode, onMaterialAdded: () => void }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);

    // Form state
    const [codigo, setCodigo] = useState('');
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState<Material['tipo'] | ''>('');
    const [especialidad, setEspecialidad] = useState<Specialization | ''>('');
    const [estado, setEstado] = useState<Material['estado']>('En Servicio');
    const [cuartel, setCuartel] = useState<Material['cuartel'] | ''>('');
    const [locationType, setLocationType] = useState<'deposito' | 'vehiculo'>('deposito');
    const [vehiculoId, setVehiculoId] = useState('');
    const [baulera, setBaulera] = useState('');
    const [deposito, setDeposito] = useState<Material['cuartel'] | ''>('');

    useEffect(() => {
        if (open) {
            getVehicles().then(setVehicles).catch(() => toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los vehículos." }));
        }
    }, [open, toast]);

    const resetForm = () => {
        setCodigo(''); setNombre(''); setTipo(''); setEspecialidad(''); setEstado('En Servicio'); setCuartel('');
        setLocationType('deposito'); setVehiculoId(''); setBaulera(''); setDeposito('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const ubicacion = locationType === 'deposito' 
            ? { type: 'deposito' as const, deposito: cuartel as Material['cuartel'] } 
            : { type: 'vehiculo' as const, vehiculoId, baulera };

        if (!codigo || !nombre || !tipo || !especialidad || !estado || !cuartel || (locationType === 'vehiculo' && (!vehiculoId || !baulera))) {
            toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor, complete todos los campos requeridos." });
            return;
        }

        setLoading(true);
        try {
            await addMaterial({ codigo, nombre, tipo, especialidad, estado, ubicacion, cuartel });
            toast({ title: "¡Éxito!", description: "El material ha sido agregado." });
            onMaterialAdded();
            resetForm();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al agregar", description: error.message });
        } finally {
            setLoading(false);
        }
    };
    
    // Automatically set deposito to match cuartel when locationType is 'deposito'
    useEffect(() => {
        if (locationType === 'deposito') {
            setDeposito(cuartel);
        }
    }, [cuartel, locationType]);
    
    // Automatically set cuartel based on selected vehicle
    useEffect(() => {
        if (locationType === 'vehiculo' && vehiculoId) {
            const selectedVehicle = vehicles.find(v => v.id === vehiculoId);
            if (selectedVehicle) {
                setCuartel(selectedVehicle.cuartel);
            }
        }
    }, [vehiculoId, vehicles, locationType]);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setOpen(isOpen); }}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline">Agregar Nuevo Material</DialogTitle>
                    <DialogDescription>Complete los detalles del nuevo ítem de inventario.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4 space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="codigo">Código</Label><Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="nombre">Nombre</Label><Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required /></div>
                        <div className="space-y-2"><Label>Tipo</Label><Select value={tipo} onValueChange={(v) => setTipo(v as any)}><SelectTrigger><SelectValue placeholder="Seleccionar tipo..."/></SelectTrigger><SelectContent>{materialTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Especialidad</Label><Select value={especialidad} onValueChange={(v) => setEspecialidad(v as any)}><SelectTrigger><SelectValue placeholder="Seleccionar especialidad..." /></SelectTrigger><SelectContent>{specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Estado</Label><Select value={estado} onValueChange={(v) => setEstado(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{estados.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Cuartel</Label><Select value={cuartel} onValueChange={(v) => setCuartel(v as any)} disabled={locationType === 'vehiculo' && !!vehiculoId}><SelectTrigger><SelectValue placeholder="Seleccionar cuartel..." /></SelectTrigger><SelectContent>{firehouses.map(fh => <SelectItem key={fh} value={fh}>{fh}</SelectItem>)}</SelectContent></Select></div>
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
                                <div className="space-y-2"><Label htmlFor="baulera">Baulera / Compartimento</Label><Input id="baulera" value={baulera} onChange={(e) => setBaulera(e.target.value)} /></div>
                            </div>
                        )}
                    </div>
                </form>
                <DialogFooter className="border-t pt-4"><Button onClick={handleSubmit} disabled={loading}>{loading ? "Guardando..." : "Guardar Material"}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
