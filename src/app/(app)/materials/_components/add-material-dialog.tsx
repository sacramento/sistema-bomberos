
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Material, Vehicle, Firefighter } from "@/lib/types";
import { addMaterial, getNextMaterialSequence } from "@/services/materials.service";
import { getVehicles } from "@/services/vehicles.service";
import { getFirefighters } from "@/services/firefighters.service";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { MATERIAL_CATEGORIES } from "@/app/lib/constants/material-categories";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";

const firehouses: Material['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
const estados: Material['estado'][] = ['En Servicio', 'Fuera de Servicio'];
const condiciones: Material['condicion'][] = ['Bueno', 'Regular', 'Malo'];
const diameterOptions = ['25mm', '38mm', '44.5mm', '63.5mm', '70mm'];
const acopleOptions = ['Storz', 'NH', 'QC', 'DSP', 'Withworth', 'Otro'];
const composicionOptions = ['Tela', 'Goma'];

const vehicleCompartments = [
    'Techo', 'Dotacion', 'Cabina',
    'Baulera 1', 'Baulera 2', 'Baulera 3', 'Baulera 4', 'Baulera 5',
    'Baulera 6', 'Baulera 7', 'Baulera 8', 'Baulera 9', 'Baulera 10'
];

interface AddMaterialDialogProps {
    children?: React.ReactNode;
    onMaterialAdded: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function AddMaterialDialog({ children, onMaterialAdded, open: controlledOpen, onOpenChange: setControlledOpen }: AddMaterialDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);
    const [generatingCode, setGeneratingCode] = useState(false);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [firefighters, setFirefighters] = useState<Firefighter[]>([]);

    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;

    const activeRole = getActiveRole(pathname);
    const isPrivileged = activeRole === 'Master' || activeRole === 'Administrador';
    
    const loggedInFirefighter = useMemo(() => {
        if (!user || firefighters.length === 0) return null;
        return firefighters.find(f => f.legajo === user.id);
    }, [user, firefighters]);

    // Solo vehículos que NO están fuera de dotación
    const availableVehicles = useMemo(() => vehicles.filter(v => v.status !== 'Fuera de Dotación'), [vehicles]);

    const managedVehicles = useMemo(() => {
        if (isPrivileged) return availableVehicles;
        if (!loggedInFirefighter) return [];
        return availableVehicles.filter(v => v.materialEncargadoIds?.includes(loggedInFirefighter.id));
    }, [isPrivileged, availableVehicles, loggedInFirefighter]);

    const [codigo, setCodigo] = useState('');
    const [nombre, setNombre] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [subCategoryId, setSubCategoryId] = useState('');
    const [itemTypeId, setItemTypeId] = useState('');
    const [marca, setMarca] = useState('');
    const [modelo, setModelo] = useState('');
    const [acople, setAcople] = useState<string>('');
    const [composicion, setComposicion] = useState<string>('');
    const [caracteristicas, setCaracteristicas] = useState('');
    const [medida, setMedida] = useState('');
    const [showCustomMedida, setShowCustomMedida] = useState(false);
    const [estado, setEstado] = useState<Material['estado']>('En Servicio');
    const [condicion, setCondicion] = useState<Material['condicion']>('Bueno');
    const [cuartel, setCuartel] = useState<string>('');
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
        setMarca(''); setModelo(''); setAcople(''); setComposicion('');
        setCaracteristicas(''); setMedida(''); setEstado('En Servicio'); setCondicion('Bueno'); setCuartel('');
        setLocationType(isPrivileged ? 'deposito' : 'vehiculo'); 
        setVehiculoId('');
        setBaulera(''); setShowCustomMedida(false);
    }, [isPrivileged]);

    useEffect(() => {
        if (open) {
            Promise.all([getVehicles(), getFirefighters()]).then(([vData, fData]) => {
                setVehicles(vData);
                setFirefighters(fData);
                if (!isPrivileged && user) {
                    const firefighter = fData.find(f => f.legajo === user.id);
                    if (firefighter) {
                        const managed = vData.filter(v => v.materialEncargadoIds?.includes(firefighter.id) && v.status !== 'Fuera de Dotación');
                        if (managed.length === 1) setVehiculoId(managed[0].id);
                    }
                }
            });
            resetForm();
        }
    }, [open, resetForm, isPrivileged, user]);

    const handleAutoGenerateCode = async () => {
        if (!categoryId || !subCategoryId || !itemTypeId) {
            toast({ title: "Faltan datos", description: "Seleccione clasificación completa." });
            return;
        }
        setGeneratingCode(true);
        try {
            const prefix = `${categoryId}${subCategoryId.split('.').pop()}${itemTypeId.split('.').pop()}`;
            const sequence = await getNextMaterialSequence(prefix);
            const formattedCode = `${prefix}${sequence.toString().padStart(3, '0')}`;
            setCodigo(formattedCode);
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

        if (!nombre || !estado || !condicion || !finalCuartel) {
            toast({ variant: "destructive", title: "Campos incompletos", description: "Nombre, Estado, Condición y Ubicación son obligatorios." });
            return;
        }

        setLoading(true);
        try {
            addMaterial({ 
                codigo, 
                nombre, 
                categoryId, 
                subCategoryId, 
                itemTypeId, 
                marca,
                modelo,
                acople: acople === '' ? undefined : acople as any,
                composicion: composicion === '' ? undefined : composicion as any,
                caracteristicas, 
                medida: medida.trim().replace(',', '.'), 
                estado, 
                ubicacion, 
                cuartel: finalCuartel as any, 
                condicion 
            }, user);
            toast({ title: "¡Éxito!", description: "El material ha sido agregado." });
            onMaterialAdded();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al agregar", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const needsTechnicalDetails = (categoryId === '02' && (subCategoryId === '02.1' || subCategoryId === '02.2')) || (categoryId === '11' && subCategoryId === '11.2');

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline">Agregar Nuevo Material</DialogTitle>
                    <DialogDescription>{isPrivileged ? 'Complete los datos del equipo.' : `Agregando materiales para sus móviles asignados.`}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-full border p-3 rounded-md bg-muted/20">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Clasificación Técnica</Label>
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
                            <Label htmlFor="codigo">Código</Label>
                            <div className="flex gap-2">
                                <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="0000000" className="font-mono" />
                                <Button type="button" variant="outline" size="icon" onClick={handleAutoGenerateCode} disabled={generatingCode || !itemTypeId}>
                                    {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="nombre">Nombre</Label><Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="marca">Marca</Label><Input id="marca" value={marca} onChange={(e) => setMarca(e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="modelo">Modelo</Label><Input id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} /></div>
                        {needsTechnicalDetails && (
                            <>
                                <div className="space-y-2">
                                    <Label>Acople</Label>
                                    <Select value={acople} onValueChange={setAcople}><SelectTrigger><SelectValue placeholder="Tipo..."/></SelectTrigger><SelectContent>{acopleOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Medida</Label>
                                    <Select value={showCustomMedida ? 'Otra' : medida} onValueChange={(v) => { if(v==='Otra'){setShowCustomMedida(true); setMedida('');}else{setShowCustomMedida(false); setMedida(v);}}}>
                                        <SelectTrigger><SelectValue placeholder="Diámetro..."/></SelectTrigger>
                                        <SelectContent>{diameterOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}<SelectItem value="Otra">Otra medida...</SelectItem></SelectContent>
                                    </Select>
                                    {showCustomMedida && <Input className="mt-2" value={medida} onChange={(e) => setMedida(e.target.value)} placeholder="Especificar..." />}
                                </div>
                            </>
                        )}
                        <div className="space-y-2"><Label>Estado</Label><Select value={estado} onValueChange={(v) => setEstado(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{estados.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Condición</Label><Select value={condicion} onValueChange={(v) => setCondicion(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{condiciones.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div className="space-y-3 pt-4 border-t">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Ubicación</Label>
                        <RadioGroup value={locationType} onValueChange={(v) => setLocationType(v as any)} disabled={!isPrivileged}>
                            {isPrivileged && <div className="flex items-center space-x-2"><RadioGroupItem value="deposito" id="r-deposito" /><Label htmlFor="r-deposito">En Depósito</Label></div>}
                            <div className="flex items-center space-x-2"><RadioGroupItem value="vehiculo" id="r-vehiculo" /><Label htmlFor="r-vehiculo">En Vehículo</Label></div>
                        </RadioGroup>
                        {locationType === 'deposito' ? (
                            <div className="space-y-2 pt-2">
                                <Label>Cuartel</Label>
                                <Select value={cuartel} onValueChange={setCuartel}><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent>{firehouses.map(fh => <SelectItem key={fh} value={fh}>{fh}</SelectItem>)}</SelectContent></Select>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                    <Label>Móvil</Label>
                                    <Select value={vehiculoId} onValueChange={setVehiculoId}><SelectTrigger><SelectValue placeholder="Unidad..." /></SelectTrigger><SelectContent>{managedVehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.numeroMovil} - {v.marca}</SelectItem>)}</SelectContent></Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Lugar</Label>
                                    <Select value={baulera} onValueChange={setBaulera}><SelectTrigger><SelectValue placeholder="Baulera..." /></SelectTrigger><SelectContent>{vehicleCompartments.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2"><Label htmlFor="caracteristicas">Notas</Label><Textarea id="caracteristicas" value={caracteristicas} onChange={(e) => setCaracteristicas(e.target.value)} /></div>
                </form>
                <DialogFooter className="border-t pt-4"><Button onClick={handleSubmit} disabled={loading}>{loading ? "Guardando..." : "Guardar Material"}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
