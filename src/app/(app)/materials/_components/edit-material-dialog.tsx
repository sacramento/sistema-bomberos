'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { Material, Vehicle } from "@/lib/types";
import { updateMaterial, getNextMaterialSequence } from "@/services/materials.service";
import { getVehicles } from "@/services/vehicles.service";
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

const vehicleCompartments = [
    'Techo', 'Dotacion', 'Cabina',
    'Baulera 1', 'Baulera 2', 'Baulera 3', 'Baulera 4', 'Baulera 5',
    'Baulera 6', 'Baulera 7', 'Baulera 8', 'Baulera 9', 'Baulera 10'
];

export default function EditMaterialDialog({ children, material, onMaterialUpdated }: { children: React.ReactNode, material: Material, onMaterialUpdated: () => void }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);
    const [generatingCode, setGeneratingCode] = useState(false);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);

    const activeRole = getActiveRole(pathname);
    const isPrivileged = activeRole === 'Master' || activeRole === 'Administrador';

    // Form state
    const [codigo, setCodigo] = useState('');
    const [nombre, setNombre] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [subCategoryId, setSubCategoryId] = useState('');
    const [itemTypeId, setItemTypeId] = useState('');
    const [marca, setMarca] = useState('');
    const [modelo, setModelo] = useState('');
    const [acople, setAcople] = useState<string>('');
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

    useEffect(() => {
        if (open) {
            getVehicles().then(setVehicles);
            setCodigo(material.codigo || '');
            setNombre(material.nombre);
            setCategoryId(material.categoryId || '');
            setSubCategoryId(material.subCategoryId || '');
            setItemTypeId(material.itemTypeId || '');
            setMarca(material.marca || '');
            setModelo(material.modelo || '');
            setAcople(material.acople || '');
            setCaracteristicas(material.caracteristicas || '');
            setMedida(material.medida || '');
            setEstado(material.estado);
            setCondicion(material.condicion || 'Bueno');
            setCuartel(material.cuartel || '');
            setLocationType(material.ubicacion.type);
            setVehiculoId(material.ubicacion.vehiculoId || '');
            setBaulera(material.ubicacion.baulera || '');
            
            const isCustom = !!material.medida && !diameterOptions.includes(material.medida);
            setShowCustomMedida(isCustom);
        }
    }, [open, material]);

    const handleAutoGenerateCode = async () => {
        if (!categoryId || !subCategoryId || !itemTypeId) {
            toast({ title: "Faltan datos", description: "Seleccione la clasificación completa para generar un código." });
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
            const normalizedMedida = medida.trim().replace(',', '.');
            await updateMaterial(material.id, { 
                codigo, 
                nombre, 
                categoryId, 
                subCategoryId, 
                itemTypeId, 
                marca,
                modelo,
                acople: acople === '' ? undefined : acople as any,
                caracteristicas, 
                medida: normalizedMedida, 
                estado, 
                ubicacion, 
                cuartel: finalCuartel as any, 
                condicion 
            }, user);
            toast({ title: "¡Éxito!", description: "El material ha sido actualizado." });
            onMaterialUpdated();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const needsTechnicalDetails = 
        (categoryId === '02' && (subCategoryId === '02.1' || subCategoryId === '02.2')) ||
        (categoryId === '11' && subCategoryId === '11.2');

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline">Editar Material</DialogTitle>
                    <DialogDescription>Modifique las características técnicas o el estado operativo del equipo.</DialogDescription>
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
                            <Label htmlFor="codigo-edit">Código</Label>
                            <div className="flex gap-2">
                                <Input id="codigo-edit" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="0000000" className="font-mono" />
                                <Button type="button" variant="outline" size="icon" onClick={handleAutoGenerateCode} disabled={generatingCode || !itemTypeId}>
                                    {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="nombre-edit">Nombre</Label><Input id="nombre-edit" value={nombre} onChange={(e) => setNombre(e.target.value)} required /></div>
                        
                        <div className="space-y-2"><Label htmlFor="marca-edit">Marca</Label><Input id="marca-edit" value={marca} onChange={(e) => setMarca(e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="modelo-edit">Modelo</Label><Input id="modelo-edit" value={modelo} onChange={(e) => setModelo(e.target.value)} /></div>

                        {needsTechnicalDetails && (
                            <>
                                <div className="space-y-2">
                                    <Label>Acople</Label>
                                    <Select value={acople} onValueChange={(v) => setAcople(v)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>{acopleOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Medida</Label>
                                    <Select value={showCustomMedida ? 'Otra' : medida} onValueChange={(v) => { if(v==='Otra'){setShowCustomMedida(true); setMedida('');}else{setShowCustomMedida(false); setMedida(v);}}}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>{diameterOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}<SelectItem value="Otra">Otra medida...</SelectItem></SelectContent>
                                    </Select>
                                    {showCustomMedida && <Input className="mt-2" value={medida} onChange={(e) => setMedida(e.target.value)} placeholder="Especificar medida..." />}
                                </div>
                            </>
                        )}

                        <div className="space-y-2"><Label>Estado</Label><Select value={estado} onValueChange={(v) => setEstado(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{estados.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Condición</Label><Select value={condicion} onValueChange={(v) => setCondicion(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{condiciones.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Ubicación (Sólo lectura para encargados)</Label>
                        <RadioGroup value={locationType} onValueChange={(v) => setLocationType(v as any)} disabled={!isPrivileged}>
                            {isPrivileged && <div className="flex items-center space-x-2"><RadioGroupItem value="deposito" id="r-dep-edit" /><Label htmlFor="r-dep-edit">En Depósito</Label></div>}
                            <div className="flex items-center space-x-2"><RadioGroupItem value="vehiculo" id="r-veh-edit" /><Label htmlFor="r-veh-edit">En Vehículo</Label></div>
                        </RadioGroup>
                        
                        {locationType === 'deposito' ? (
                            <div className="space-y-2 pt-2">
                                <Label>Cuartel</Label>
                                <Select value={cuartel} onValueChange={(v) => setCuartel(v)} disabled={!isPrivileged}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{firehouses.map(fh => <SelectItem key={fh} value={fh}>{fh}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2"><Label>Móvil</Label><Select value={vehiculoId} onValueChange={setVehiculoId} disabled={!isPrivileged}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.numeroMovil}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Baulera</Label><Select value={baulera} onValueChange={setBaulera}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{vehicleCompartments.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2"><Label htmlFor="caracteristicas">Notas Adicionales</Label><Textarea value={caracteristicas} onChange={(e) => setCaracteristicas(e.target.value)} /></div>
                </form>
                <DialogFooter className="border-t pt-4">
                    <Button onClick={handleSubmit} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null} Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
