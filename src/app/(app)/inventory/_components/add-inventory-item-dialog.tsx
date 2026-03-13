
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useCallback } from "react";
import { GeneralInventoryItem } from "@/lib/types";
import { addGeneralInventoryItem, getNextInventorySequence } from "@/services/general-inventory.service";
import { Textarea } from "@/components/ui/textarea";
import { INVENTORY_CATEGORIES } from "@/app/lib/constants/inventory-categories";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/context/auth-context";

const cuarteles: GeneralInventoryItem['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3', 'Comision'];
const ubicaciones: GeneralInventoryItem['ubicacion'][] = ['Baño', 'Matera', 'Cocina', 'Roperia', 'Cadetes', 'Deposito', 'Jefatura', 'Cambiaderos', 'Patio', 'Playón', 'Guardia', 'Ayudantia'];
const estados: GeneralInventoryItem['estado'][] = ['En Servicio', 'Fuera de Servicio'];
const condiciones: GeneralInventoryItem['condicion'][] = ['Bueno', 'Regular', 'Malo'];

export default function AddInventoryItemDialog({ children, onItemAdded }: { children: React.ReactNode, onItemAdded: () => void }) {
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

    const subCategories = useMemo(() => {
        return INVENTORY_CATEGORIES.find(c => c.id === categoryId)?.subCategories || [];
    }, [categoryId]);

    const itemTypes = useMemo(() => {
        return subCategories.find(s => s.id === subCategoryId)?.items || [];
    }, [subCategoryId, subCategories]);

    const resetForm = useCallback(() => {
        setCodigo(''); setNombre(''); setCategoryId(''); setSubCategoryId(''); setItemTypeId('');
        setMarca(''); setModelo(''); setCaracteristicas(''); setEstado('En Servicio');
        setCondicion('Bueno'); setCuartel(''); setUbicacion('');
    }, []);

    const handleAutoGenerateCode = async () => {
        if (!categoryId || !subCategoryId || !itemTypeId) {
            toast({ title: "Faltan datos", description: "Seleccione una clasificación completa antes de generar el código." });
            return;
        }
        setGeneratingCode(true);
        try {
            const prefix = `${categoryId}${subCategoryId.split('.').pop()}${itemTypeId.split('.').pop()}`;
            const sequence = await getNextInventorySequence(prefix);
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
        if (!codigo || !nombre || !itemTypeId || !estado || !condicion || !cuartel || !ubicacion) {
            toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor, complete todos los campos requeridos." });
            return;
        }

        setLoading(true);
        try {
            await addGeneralInventoryItem({ 
                codigo, nombre, categoryId, subCategoryId, itemTypeId, 
                marca, modelo, caracteristicas, estado, condicion, cuartel, ubicacion 
            }, actor);
            toast({ title: "¡Éxito!", description: "El ítem ha sido agregado al inventario." });
            onItemAdded();
            resetForm();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al agregar", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline">Agregar al Inventario General</DialogTitle>
                    <DialogDescription>Clasifique el bien y complete sus detalles técnicos.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4 space-y-4 py-4">
                    <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Clasificación Jerárquica</Label>
                        <div className="grid grid-cols-1 gap-2">
                            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubCategoryId(''); setItemTypeId(''); }}>
                                <SelectTrigger><SelectValue placeholder="1. Categoría Principal" /></SelectTrigger>
                                <SelectContent>{INVENTORY_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="codigo">Código</Label>
                            <div className="flex gap-2">
                                <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} required placeholder="ID-000" className="font-mono" />
                                <Button type="button" variant="outline" size="icon" onClick={handleAutoGenerateCode} disabled={generatingCode || !itemTypeId}>
                                    {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="nombre">Nombre / Descripción</Label><Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Ej: Mesa de reuniones" /></div>
                        <div className="space-y-2"><Label htmlFor="marca">Marca</Label><Input id="marca" value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ej: Samsung, Philips, etc." /></div>
                        <div className="space-y-2"><Label htmlFor="modelo">Modelo</Label><Input id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="N/S o Nombre del modelo" /></div>
                        
                        <div className="space-y-2"><Label>Cuartel/Comisión</Label><Select value={cuartel} onValueChange={(v) => setCuartel(v as any)} required><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent>{cuarteles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Ubicación</Label><Select value={ubicacion} onValueChange={(v) => setUbicacion(v as any)} required><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent>{ubicaciones.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
                        
                        <div className="space-y-2"><Label>Estado</Label><Select value={estado} onValueChange={(v) => setEstado(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{estados.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Condición</Label><Select value={condicion} onValueChange={(v) => setCondicion(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{condiciones.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                        
                        <div className="space-y-2 col-span-full">
                            <Label htmlFor="caracteristicas">Características Adicionales</Label>
                            <Textarea id="caracteristicas" value={caracteristicas} onChange={(e) => setCaracteristicas(e.target.value)} placeholder="Dimensiones, color, o detalles de interés..." />
                        </div>
                    </div>
                </form>
                <DialogFooter className="border-t pt-4">
                    <Button onClick={handleSubmit} disabled={loading}>{loading ? "Guardando..." : "Guardar Ítem"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
