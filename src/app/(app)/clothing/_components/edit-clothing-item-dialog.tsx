'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import { ClothingItem, Firefighter } from "@/lib/types";
import { updateClothingItem, getNextClothingSequence } from "@/services/clothing.service";
import { CLOTHING_CATEGORIES } from "@/app/lib/constants/clothing-categories";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { SingleFirefighterSelect } from "@/components/firefighter-select";

const clothingStates: ClothingItem['state'][] = ['Nuevo', 'Bueno', 'Regular', 'Malo', 'Baja'];

interface EditClothingItemDialogProps {
    children: React.ReactNode;
    onSave: () => void;
    firefighters: Firefighter[];
    item: ClothingItem;
}

export default function EditClothingItemDialog({ children, onSave, firefighters, item }: EditClothingItemDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const { user: actor } = useAuth();
    const [loading, setLoading] = useState(false);
    const [generatingCode, setGeneratingCode] = useState(false);

    // Form state
    const [code, setCode] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [subCategoryId, setSubCategoryId] = useState('');
    const [itemTypeId, setItemTypeId] = useState('');
    const [size, setSize] = useState('');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [state, setState] = useState<ClothingItem['state']>('Bueno');
    const [observations, setObservations] = useState('');
    
    // Assignment state
    const [assignmentType, setAssignmentType] = useState<'deposito' | 'firefighter'>('deposito');
    const [selectedFirefighter, setSelectedFirefighter] = useState<Firefighter | null>(null);

    const activeFirefighters = useMemo(() => firefighters.filter(f => f.status === 'Active' || f.status === 'Auxiliar'), [firefighters]);

    useEffect(() => {
        if(open) {
            setCode(item.code || '');
            setCategoryId(item.categoryId || '');
            setSubCategoryId(item.subCategoryId || '');
            setItemTypeId(item.itemTypeId || '');
            setSize(item.size || '');
            setBrand(item.brand || '');
            setModel(item.model || '');
            setState(item.state || 'Bueno');
            setObservations(item.observations || '');
            setAssignmentType(item.firefighterId ? 'firefighter' : 'deposito');
            setSelectedFirefighter(item.firefighter || null);
        }
    }, [open, item]);

    const subCategories = useMemo(() => {
        return CLOTHING_CATEGORIES.find(c => c.id === categoryId)?.subCategories || [];
    }, [categoryId]);

    const itemTypes = useMemo(() => {
        return subCategories.find(s => s.id === subCategoryId)?.items || [];
    }, [subCategoryId, subCategories]);

    const handleAutoGenerateCode = async () => {
        if (!categoryId || !subCategoryId || !itemTypeId) return;
        setGeneratingCode(true);
        try {
            const prefix = `${categoryId}${subCategoryId.split('.').pop()}${itemTypeId.split('.').pop()}`;
            const sequence = await getNextClothingSequence(prefix);
            setCode(`${prefix}${sequence.toString().padStart(3, '0')}`);
        } finally {
            setGeneratingCode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!code || !categoryId || !subCategoryId || !itemTypeId || !size || !state) {
            toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor, complete todos los campos requeridos." });
            return;
        }

        if (assignmentType === 'firefighter' && !selectedFirefighter) {
            toast({ variant: "destructive", title: "Asignación requerida", description: "Debe seleccionar un bombero para realizar la asignación." });
            return;
        }

        setLoading(true);
        try {
            const selectedItemTypeLabel = itemTypes.find(i => i.id === itemTypeId)?.label || 'Prenda';
            const finalTypeLabel = selectedItemTypeLabel.split(' ').slice(1).join(' ');

            const dataToUpdate: Partial<Omit<ClothingItem, 'id' | 'firefighter'>> = {
                code,
                categoryId,
                subCategoryId,
                itemTypeId,
                type: finalTypeLabel,
                size,
                brand,
                model,
                observations,
                state,
                firefighterId: assignmentType === 'firefighter' ? selectedFirefighter?.id : undefined,
                deliveredAt: (assignmentType === 'firefighter' && selectedFirefighter?.id !== item.firefighterId) 
                    ? new Date().toISOString() 
                    : (assignmentType === 'firefighter' ? item.deliveredAt : undefined),
            };

            await updateClothingItem(item.id, dataToUpdate, actor);
            toast({ title: "¡Éxito!", description: "La prenda ha sido actualizada." });
            onSave();
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
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline">Editar Prenda</DialogTitle>
                    <DialogDescription>Modifique los detalles de la prenda.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4 space-y-6 py-4">
                    
                    <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Clasificación</Label>
                        <div className="grid grid-cols-1 gap-2">
                            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubCategoryId(''); setItemTypeId(''); }}>
                                <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                                <SelectContent>{CLOTHING_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
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

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="code-edit">Código</Label>
                            <div className="flex gap-2">
                                <Input id="code-edit" value={code} onChange={(e) => setCode(e.target.value)} required className="font-mono" />
                                <Button type="button" variant="outline" size="icon" onClick={handleAutoGenerateCode} disabled={generatingCode || !itemTypeId}>
                                    {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="size-edit">Talle</Label><Input id="size-edit" value={size} onChange={(e) => setSize(e.target.value)} required /></div>
                        <div className="space-y-2"><Label>Estado</Label><Select value={state} onValueChange={(v) => setState(v as any)} required><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent>{clothingStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="brand-edit">Marca</Label><Input id="brand-edit" value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="model-edit">Modelo</Label><Input id="model-edit" value={model} onChange={(e) => setModel(e.target.value)} /></div>
                    </div>

                    <div className="space-y-4 border p-4 rounded-lg bg-primary/5 border-primary/10">
                        <Label className="text-xs font-bold uppercase text-primary">Ubicación y Asignación (Obligatorio)</Label>
                        <RadioGroup value={assignmentType} onValueChange={(v) => setAssignmentType(v as any)} className="flex flex-col sm:flex-row gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="deposito" id="edit-deposito" />
                                <Label htmlFor="edit-deposito" className="font-semibold cursor-pointer">En Depósito</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="firefighter" id="edit-firefighter" />
                                <Label htmlFor="edit-firefighter" className="font-semibold cursor-pointer">Asignado a Bombero</Label>
                            </div>
                        </RadioGroup>

                        {assignmentType === 'firefighter' && (
                            <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                                <Label className="mb-2 block">Cambiar Asignación</Label>
                                <SingleFirefighterSelect
                                    title="Bombero"
                                    selected={selectedFirefighter}
                                    onSelectedChange={setSelectedFirefighter}
                                    firefighters={activeFirefighters}
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="observations-edit">Observaciones</Label>
                        <Textarea id="observations-edit" value={observations} onChange={(e) => setObservations(e.target.value)} />
                    </div>
                </form>
                <DialogFooter className="border-t pt-4"><Button onClick={handleSubmit} disabled={loading}>{loading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null} {loading ? "Guardando..." : "Guardar Cambios"}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
