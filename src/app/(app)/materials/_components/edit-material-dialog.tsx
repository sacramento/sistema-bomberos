'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { Material, Specialization, Vehicle } from "@/lib/types";
import { updateMaterial, getNextMaterialSequence } from "@/services/materials.service";
import { getVehicles } from "@/services/vehicles.service";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";

const materialTypes: Material['tipo'][] = [
    'BOMBEO', 'COMUNICACION', 'DOCUMENTACION', 'ESTABILIZACION', 'H. CORTE', 
    'H. ELECTRICA', 'H. GOLPE', 'H. HIDRAULICA', 'H. NEUMATICA', 'HERRAMIENTA', 
    'ILUMINACION', 'INMOVILIZACION', 'MEDICION', 'LANZA', 'LOGISTICA', 'MANGA', 
    'MEDICO', 'PROTECCION', 'RESPIRACION', 'TRANSPORTE'
].sort() as Material['tipo'][];

const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'GENERAL'];
const firehouses: Material['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
const estados: Material['estado'][] = ['En Servicio', 'Fuera de Servicio'];
const condiciones: Material['condicion'][] = ['Bueno', 'Regular', 'Malo'];

const diameterOptions = ['25mm', '38mm', '44.5mm', '63.5mm', '70mm'];

const vehicleCompartments = [
    'Techo', 'Dotacion', 'Cabina',
    'Baulera 1', 'Baulera 2', 'Baulera 3', 'Baulera 4', 'Baulera 5',
    'Baulera 6', 'Baulera 7', 'Baulera 8', 'Baulera 9', 'Baulera 10'
];

export default function EditMaterialDialog({ children, material, onMaterialUpdated }: { children: React.ReactNode, material: Material, onMaterialUpdated: () => void }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [generatingCode, setGeneratingCode] = useState(false);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);

    // Form state
    const [codigo, setCodigo] = useState('');
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState<Material['tipo'] | ''>('');
    const [especialidad, setEspecialidad] = useState<Specialization | ''>('');
    const [caracteristicas, setCaracteristicas] = useState('');
    const [medida, setMedida] = useState('');
    const [showCustomMedida, setShowCustomMedida] = useState(false);
    const [estado, setEstado] = useState<Material['estado']>('En Servicio');
    const [condicion, setCondicion] = useState<Material['condicion']>('Bueno');
    const [cuartel, setCuartel] = useState<Material['cuartel'] | ''>('');
    const [locationType, setLocationType] = useState<'deposito' | 'vehiculo'>('deposito');
    const [vehiculoId, setVehiculoId] = useState('');
    const [baulera, setBaulera] = useState('');

    useEffect(() => {
        if (open) {
            getVehicles().then(setVehicles).catch(() => toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los vehículos." }));
            setCodigo(material.codigo);
            setNombre(material.nombre);
            setTipo(material.tipo);
            setEspecialidad(material.especialidad);
            setCaracteristicas(material.caracteristicas || '');
            setMedida(material.medida || '');
            setEstado(material.estado);
            setCondicion(material.condicion || 'Bueno');
            setCuartel(material.cuartel);
            setLocationType(material.ubicacion.type);
            setVehiculoId(material.ubicacion.vehiculoId || '');
            setBaulera(material.ubicacion.baulera || '');
            
            const isCustom = !!material.medida && !diameterOptions.includes(material.medida);
            setShowCustomMedida(isCustom);
        }
    }, [open, material, toast]);

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
            // Aseguramos que medida se envíe limpia
            const finalMedida = medida.trim();
            
            await updateMaterial(material.id, { codigo, nombre, tipo, especialidad, caracteristicas, medida: finalMedida, estado, ubicacion, cuartel, condicion }, { id: 'admin', name: 'Admin', role: 'Master', roles: { asistencia: 'Administrador', aspirantes: 'Administrador', semanas: 'Administrador', movilidad: 'Administrador', materiales: 'Administrador', ayudantia: 'Administrador', roperia: 'Administrador', servicios: 'Administrador', cascada: 'Administrador' } });
            toast({ title: "¡Éxito!", description: "El material ha sido actualizado." });
            onMaterialUpdated();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al actualizar", description: error.message });
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

    const handleMedidaChange = (value: string) => {
        if (value === 'Otra') {
            setShowCustomMedida(true);
            // No reseteamos la medida inmediatamente para que si ya tiene una personalizada no se borre al cambiar el dropdown
        } else {
            setShowCustomMedida(false);
            setMedida(value);
        }
    }

    const isMedidaType = tipo === 'MANGA' || tipo === 'LANZA';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline">Editar Material</DialogTitle>
                    <DialogDescription>Modifique los detalles del ítem de inventario.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4 space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="codigo-edit">Código</Label>
                            <div className="flex gap-2">
                                <Input id="codigo-edit" value={codigo} onChange={(e) => setCodigo(e.target.value)} required placeholder="Ej: REHA001" className="flex-grow font-mono" />
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={handleAutoGenerateCode}
                                    disabled={generatingCode || !tipo || !especialidad}
                                    title="Auto-generar código"
                                >
                                    {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="nombre-edit">Nombre</Label><Input id="nombre-edit" value={nombre} onChange={(e) => setNombre(e.target.value)} required /></div>
                        <div className="space-y-2"><Label>Tipo</Label><Select value={tipo} onValueChange={(v) => setTipo(v as any)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{materialTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Especialidad</Label><Select value={especialidad} onValueChange={(v) => setEspecialidad(v as any)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        
                        {isMedidaType && (
                            <div className="space-y-2">
                                <Label>Diámetro / Medida</Label>
                                <Select value={showCustomMedida ? 'Otra' : medida} onValueChange={handleMedidaChange}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar diámetro..."/></SelectTrigger>
                                    <SelectContent>
                                        {diameterOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                        <SelectItem value="Otra">Otra medida...</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {isMedidaType && showCustomMedida && (
                            <div className="space-y-2">
                                <Label htmlFor="medida-manual-edit">Especificar Medida</Label>
                                <Input id="medida-manual-edit" value={medida} onChange={(e) => setMedida(e.target.value)} placeholder="Ej: 100mm" />
                            </div>
                        )}

                        <div className="space-y-2"><Label>Estado</Label><Select value={estado} onValueChange={(v) => setEstado(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{estados.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Condición</Label><Select value={condicion} onValueChange={(v) => setCondicion(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{condiciones.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2">
                            <Label>Cuartel</Label>
                            <Select value={cuartel} onValueChange={(v) => setCuartel(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{firehouses.map(fh => <SelectItem key={fh} value={fh}>{fh}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>

                     <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label htmlFor="caracteristicas-edit">Características</Label>
                        <Textarea id="caracteristicas-edit" value={caracteristicas} onChange={(e) => setCaracteristicas(e.target.value)} placeholder="Modelo, N/S, vencimiento, etc." />
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                        <Label>Ubicación</Label>
                        <RadioGroup value={locationType} onValueChange={(v) => setLocationType(v as any)}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="deposito" id="r-deposito-edit" /><Label htmlFor="r-deposito-edit">Depósito</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="vehiculo" id="r-vehiculo-edit" /><Label htmlFor="r-vehiculo-edit">Vehículo</Label></div>
                        </RadioGroup>
                        {locationType === 'vehiculo' && (
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2"><Label>Móvil</Label><Select value={vehiculoId} onValueChange={setVehiculoId}><SelectTrigger><SelectValue placeholder="Seleccionar móvil..." /></SelectTrigger><SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.numeroMovil}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2">
                                    <Label htmlFor="baulera-edit">Ubicación en Móvil</Label>
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
                <DialogFooter className="border-t pt-4"><Button onClick={handleSubmit} disabled={loading}>{loading ? "Guardando..." : "Guardar Cambios"}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}