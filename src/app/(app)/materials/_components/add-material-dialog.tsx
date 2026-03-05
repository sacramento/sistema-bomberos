
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Material, Vehicle } from "@/lib/types";
import { addMaterial, getNextMaterialSequence } from "@/services/materials.service";
import { getVehicles } from "@/services/vehicles.service";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { MATERIAL_CATEGORIES } from "@/app/lib/constants/material-categories";

const firehouses: Material['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
const estados: Material['estado'][] = ['En Servicio', 'Fuera de Servicio'];
const condiciones: Material['condicion'][] = ['Bueno', 'Regular', 'Malo'];
const diameterOptions = ['25mm', '38mm', '44.5mm', '63.5mm', '70mm'];

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
    const [categoryId, setCategoryId] = useState('');
    const [subCategoryId, setSubCategoryId] = useState('');
    const [itemTypeId, setItemTypeId] = useState('');
    const [caracteristicas, setCaracteristicas] = useState('');
    const [medida, setMedida] = useState('');
    const [showCustomMedida, setShowCustomMedida] = useState(false);
    const [estado, setEstado] = useState<Material['estado']>('En Servicio');
    const [condicion, setCondicion] = useState<Material['condicion']>('Bueno');
    const [cuartel, setCuartel] = useState<Material['cuartel'] | ''>('');
    const [locationType, setLocationType] = useState<'deposito' | 'vehiculo'>('deposito');
    const [vehiculoId, setVehiculoId] = useState('');
    const [baulera, setBaulera] = useState('');

    const subCategories = useMemo(() => {
        return MATERIAL_CATEGORIES.find(c => c.id === categoryId)?.subCategories || [];
    }, [categoryId]);

    const itemTypes = useMemo(() => {
        return subCategories.find(s => s.id === subCategoryId)?.items || [];
    }, [subCategoryId, subCategories]);

    const resetForm = useCallback(() => {
        setCodigo(''); setNombre(''); setCategoryId(''); setSubCategoryId(''); setItemTypeId('');
        setCaracteristicas(''); setMedida(''); setEstado('En Servicio'); setCondicion('Bueno'); setCuartel('');
        setLocationType('deposito'); setVehiculoId(''); setBaulera(''); setShowCustomMedida(false);
    }, []);

    useEffect(() => {
        if (open) {
            getVehicles().then(setVehicles);
            if (initialData) {
                setNombre(initialData.nombre);
                setCategoryId(initialData.categoryId || '');
                setSubCategoryId(initialData.subCategoryId || '');
                setItemTypeId(initialData.itemTypeId || '');
                setCaracteristicas(initialData.caracteristicas || '');
                setMedida(initialData.medida || '');
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
    }, [open, initialData, resetForm]);

    const handleAutoGenerateCode = async () => {
        if (!categoryId || !subCategoryId) {
            toast({ title: "Faltan datos", description: "Seleccione Categoría y Subcategoría." });
            return;
        }

        setGeneratingCode(true);
        try {
            // New prefix format: "02-21-"
            const cat = categoryId;
            const sub = subCategoryId.split('.')[1] || subCategoryId;
            const prefix = `${cat}-${sub}-`;
            
            const sequence = await getNextMaterialSequence(prefix);
            const formattedCode = `${prefix}${sequence.toString().padStart(3, '0')}`;
            
            setCodigo(formattedCode);
            toast({ title: "Código generado", description: `Se ha asignado el código: ${formattedCode}` });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo generar el código." });
        } finally {
            setGeneratingCode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalCuartel = cuartel;
        if (locationType === 'vehiculo' && vehiculoId) {
            const v = vehicles.find(v => v.id === vehiculoId);
            if (v) finalCuartel = v.cuartel;
        }

        const ubicacion = locationType === 'deposito' 
            ? { type: 'deposito' as const, deposito: finalCuartel as any } 
            : { type: 'vehiculo' as const, vehiculoId, baulera };

        if (!codigo || !nombre || !categoryId || !subCategoryId || !itemTypeId || !estado || !condicion || !finalCuartel) {
            toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor, complete todos los campos requeridos." });
            return;
        }

        setLoading(true);
        try {
            await addMaterial({ 
                codigo, 
                nombre, 
                categoryId, 
                subCategoryId, 
                itemTypeId, 
                caracteristicas, 
                medida: medida.trim().replace(',', '.'), 
                estado, 
                ubicacion, 
                cuartel: finalCuartel as any, 
                condicion 
            }, null);
            toast({ title: "¡Éxito!", description: "El material ha sido agregado." });
            onMaterialAdded();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al agregar", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const isMedidaType = categoryId === '02' && subCategoryId === '02.2'; // Mangueras

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline">{initialData ? 'Clonar Material' : 'Agregar Nuevo Material'}</DialogTitle>
                    <DialogDescription>Complete la clasificación y ubicación del equipo.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-full">
                            <Label>Clasificación (Jerarquía)</Label>
                            <div className="grid grid-cols-1 gap-2">
                                <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubCategoryId(''); setItemTypeId(''); }}>
                                    <SelectTrigger><SelectValue placeholder="1. Categoría" /></SelectTrigger>
                                    <SelectContent>{MATERIAL_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={subCategoryId} onValueChange={(v) => { setSubCategoryId(v); setItemTypeId(''); }} disabled={!categoryId}>
                                    <SelectTrigger><SelectValue placeholder="2. Subcategoría" /></SelectTrigger>
                                    <SelectContent>{subCategories.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={itemTypeId} onValueChange={setItemTypeId} disabled={!subCategoryId}>
                                    <SelectTrigger><SelectValue placeholder="3. Tipo de Ítem" /></SelectTrigger>
                                    <SelectContent>{itemTypes.map(i => <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="codigo">Código Único</Label>
                            <div className="flex gap-2">
                                <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} required placeholder="Ej: 02-21-001" className="flex-grow font-mono" />
                                <Button type="button" variant="outline" size="icon" onClick={handleAutoGenerateCode} disabled={generatingCode || !subCategoryId} title="Auto-generar">
                                    {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="nombre">Nombre del Equipo</Label><Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Ej: Manguera de 38mm Expansiva" /></div>
                        
                        {isMedidaType && (
                            <div className="space-y-2">
                                <Label>Diámetro / Medida</Label>
                                <Select value={showCustomMedida ? 'Otra' : medida} onValueChange={(v) => { if(v==='Otra'){setShowCustomMedida(true); setMedida('');}else{setShowCustomMedida(false); setMedida(v);}}}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                                    <SelectContent>{diameterOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}<SelectItem value="Otra">Otra medida...</SelectItem></SelectContent>
                                </Select>
                            </div>
                        )}
                        {isMedidaType && showCustomMedida && (
                            <div className="space-y-2"><Label>Especificar Medida</Label><Input value={medida} onChange={(e) => setMedida(e.target.value)} placeholder="Ej: 100mm" /></div>
                        )}

                        <div className="space-y-2"><Label>Estado Operativo</Label><Select value={estado} onValueChange={(v) => setEstado(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{estados.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Condición Física</Label><Select value={condicion} onValueChange={(v) => setCondition(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{condiciones.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                        <Label>Ubicación y Cuartel</Label>
                        <RadioGroup value={locationType} onValueChange={(v) => setLocationType(v as any)}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="deposito" id="r-deposito" /><Label htmlFor="r-deposito">En Depósito</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="vehiculo" id="r-vehiculo" /><Label htmlFor="r-vehiculo">En Vehículo</Label></div>
                        </RadioGroup>
                        
                        {locationType === 'deposito' ? (
                            <div className="space-y-2 pt-2">
                                <Label>Seleccionar Cuartel del Depósito</Label>
                                <Select value={cuartel} onValueChange={(v) => setCuartel(v as any)}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar cuartel..." /></SelectTrigger>
                                    <SelectContent>{firehouses.map(fh => <SelectItem key={fh} value={fh}>{fh}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2"><Label>Móvil</Label><Select value={vehiculoId} onValueChange={setVehiculoId}><SelectTrigger><SelectValue placeholder="Móvil..." /></SelectTrigger><SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.numeroMovil} - {v.marca}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Baulera / Lugar</Label><Select value={baulera} onValueChange={setBaulera}><SelectTrigger><SelectValue placeholder="Lugar..." /></SelectTrigger><SelectContent>{vehicleCompartments.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2"><Label htmlFor="caracteristicas">Características Técnicas</Label><Textarea id="caracteristicas" value={caracteristicas} onChange={(e) => setCaracteristicas(e.target.value)} placeholder="Modelo, N/S, vencimientos, etc." /></div>
                </form>
                <DialogFooter className="border-t pt-4"><Button onClick={handleSubmit} disabled={loading}>{loading ? "Guardando..." : "Guardar Material"}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
