
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { GeneralInventoryItem } from "@/lib/types";
import { updateGeneralInventoryItem, getNextInventorySequence } from "@/services/general-inventory.service";
import { Textarea } from "@/components/ui/textarea";
import { INVENTORY_CATEGORIES } from "@/app/lib/constants/inventory-categories";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/context/auth-context";

const cuarteles: GeneralInventoryItem['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3', 'Comision'];
const ubicaciones: GeneralInventoryItem['ubicacion'][] = ['Baño', 'Matera', 'Cocina', 'Roperia', 'Cadetes', 'Deposito', 'Jefatura', 'Cambiaderos', 'Patio', 'Playón', 'Guardia', 'Ayudantia'];
const estados: GeneralInventoryItem['estado'][] = ['En Servicio', 'Fuera de Servicio'];
const condiciones: GeneralInventoryItem['condicion'][] = ['Bueno', 'Regular', 'Malo'];

export default function EditInventoryItemDialog({ children, item, onItemUpdated }: { children: React.ReactNode, item: GeneralInventoryItem, onItemUpdated: () => void }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const { user: actor } = useAuth();
    const [loading, setLoading] = useState(false);
    const [generatingCode, setGeneratingCode] = useState(false);

    // Form state
    const [codigo, setCodigo] = useState('');
    const [nombre, setNombre] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [subCategoryId, setSubCategoryId] = useState('');
    const [itemTypeId, setItemTypeId] = useState('');
    const [marca, setMarca] = useState('');
    const [modelo, setModelo] = useState('');
    const [caracteristicas, setCaracteristicas] = useState('');
    const [estado, setEstado] = useState<GeneralInventoryItem['estado']>('En Servicio');
    const [condicion, setCondicion] = useState<GeneralInventoryItem['condicion']>('Bueno');
    const [cuartel, setCuartel] = useState<GeneralInventoryItem['cuartel'] | ''>('');
    const [ubicacion, setUbicacion] = useState<GeneralInventoryItem['ubicacion'] | ''>('');
    
    useEffect(() => {
        if(open) {
            setCodigo(item.codigo || '');
            setNombre(item.nombre);
            setCategoryId(item.categoryId || '');
            setSubCategoryId(item.subCategoryId || '');
            setItemTypeId(item.itemTypeId || '');
            setMarca(item.marca || '');
            setModelo(item.modelo || '');
            setCaracteristicas(item.caracteristicas || '');
            setEstado(item.estado);
            setCondicion(item.condicion);
            setCuartel(item.cuartel);
            setUbicacion(item.ubicacion);
        }
    }, [open, item]);

    const subCategories = useMemo(() => {
        return INVENTORY_CATEGORIES.find(c => c.id === categoryId)?.subCategories || [];
    }, [categoryId]);

    const itemTypes = useMemo(() => {
        return subCategories.find(s => s.id === subCategoryId)?.items || [];
    }, [subCategoryId, subCategories]);

    const handleAutoGenerateCode = async () => {
        if (!categoryId || !subCategoryId || !itemTypeId) return;
        setGeneratingCode(true);
        try {
            const prefix = `${categoryId}${subCategoryId.split('.').pop()}${itemTypeId.split('.').pop()}`;
            const sequence = await getNextInventorySequence(prefix);
            setCodigo(`${prefix}${sequence.toString().padStart(3, '0')}`);
        } finally {
            setGeneratingCode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!codigo || !nombre || !itemTypeId || !estado || !condicion || !cuartel || !ubicacion) {
            toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor, complete todos los campos requeridos." });
            return;
        }

        setLoading(true);
        try {
            await updateGeneralInventoryItem(item.id, { 
                codigo, nombre, categoryId, subCategoryId, itemTypeId, 
                marca, modelo, caracteristicas, estado, condicion, cuartel, ubicacion 
            }, actor);
            toast({ title: "¡Éxito!", description: "El ítem ha sido actualizado." });
            onItemUpdated();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al actualizar", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline">Editar Ítem del Inventario</DialogTitle>
                    <DialogDescription>Modifique los detalles técnicos del bien.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4 space-y-4 py-4">
                    <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Clasificación</Label>
                        <div className="grid grid-cols-1 gap-2">
                            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubCategoryId(''); setItemTypeId(''); }}>
                                <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                                <SelectContent>{INVENTORY_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={subCategoryId} onValueChange={(v) => { setSubCategoryId(v); setItemTypeId(''); }} disabled={!categoryId}>
                                <SelectTrigger><SelectValue placeholder="Subcategoría" /></SelectTrigger>
                                <SelectContent>{subCategories.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={itemTypeId} onValueChange={setItemTypeId} disabled={!subCategoryId}>
                                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                                <SelectContent>{itemTypes.map(i => <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="codigo-edit">Código</Label>
                            <div className="flex gap-2">
                                <Input id="codigo-edit" value={codigo} onChange={(e) => setCodigo(e.target.value)} required className="font-mono" />
                                <Button type="button" variant="outline" size="icon" onClick={handleAutoGenerateCode} disabled={generatingCode || !itemTypeId}>
                                    {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="nombre-edit">Nombre</Label><Input id="nombre-edit" value={nombre} onChange={(e) => setNombre(e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="marca-edit">Marca</Label><Input id="marca-edit" value={marca} onChange={(e) => setMarca(e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="modelo-edit">Modelo</Label><Input id="modelo-edit" value={modelo} onChange={(e) => setModelo(e.target.value)} /></div>
                        
                        <div className="space-y-2"><Label>Cuartel/Comisión</Label><Select value={cuartel} onValueChange={(v) => setCuartel(v as any)} required><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{cuarteles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Ubicación</Label><Select value={ubicacion} onValueChange={(v) => setUbicacion(v as any)} required><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{ubicaciones.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
                        
                        <div className="space-y-2"><Label>Estado</Label><Select value={estado} onValueChange={(v) => setEstado(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{estados.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Condición</Label><Select value={condicion} onValueChange={(v) => setCondicion(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{condiciones.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                        
                        <div className="space-y-2 col-span-full">
                            <Label htmlFor="caracteristicas-edit">Características</Label>
                            <Textarea id="caracteristicas-edit" value={caracteristicas} onChange={(e) => setCaracteristicas(e.target.value)} />
                        </div>
                    </div>
                </form>
                <DialogFooter className="border-t pt-4">
                    <Button onClick={handleSubmit} disabled={loading}>{loading ? "Guardando..." : "Guardar Cambios"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
