
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect, useCallback } from "react";
import { ClothingItem, Firefighter } from "@/lib/types";
import { addClothingItem, getNextClothingSequence } from "@/services/clothing.service";
import { CLOTHING_CATEGORIES } from "@/app/lib/constants/clothing-categories";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

const clothingStates: ClothingItem['state'][] = ['Nuevo', 'Bueno', 'Regular', 'Malo', 'Baja'];

interface AddClothingItemDialogProps {
    children?: React.ReactNode;
    onSave: () => void;
    firefighters: Firefighter[];
    initialData?: ClothingItem | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function AddClothingItemDialog({ children, onSave, firefighters, initialData, open: controlledOpen, onOpenChange: setControlledOpen }: AddClothingItemDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const { toast } = useToast();
    const { user: actor } = useAuth();
    const [loading, setLoading] = useState(false);
    const [generatingCode, setGeneratingCode] = useState(false);

    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;

    // Form state
    const [code, setCode] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [subCategoryId, setSubCategoryId] = useState('');
    const [itemTypeId, setItemTypeId] = useState('');
    const [type, setType] = useState('');
    const [size, setSize] = useState('');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [state, setState] = useState<ClothingItem['state']>('Bueno');
    const [observations, setObservations] = useState('');
    const [selectedFirefighter, setSelectedFirefighter] = useState<Firefighter | null>(null);
    const [firefighterComboboxOpen, setFirefighterComboboxOpen] = useState(false);

    const activeFirefighters = useMemo(() => firefighters.filter(f => f.status === 'Active' || f.status === 'Auxiliar'), [firefighters]);

    const subCategories = useMemo(() => {
        return CLOTHING_CATEGORIES.find(c => c.id === categoryId)?.subCategories || [];
    }, [categoryId]);

    const itemTypes = useMemo(() => {
        return subCategories.find(s => s.id === subCategoryId)?.items || [];
    }, [subCategoryId, subCategories]);

    const resetForm = useCallback(() => {
        setCode(''); setCategoryId(''); setSubCategoryId(''); setItemTypeId('');
        setType(''); setSize(''); setBrand(''); setModel('');
        setState('Bueno'); setObservations(''); setSelectedFirefighter(null);
    }, []);
    
     useEffect(() => {
        if (open) {
            if (initialData) {
                // Pre-fill form for cloning
                setCode(''); // Code must be unique
                setCategoryId(initialData.categoryId || '');
                setSubCategoryId(initialData.subCategoryId || '');
                setItemTypeId(initialData.itemTypeId || '');
                setType(initialData.type || '');
                setSize(initialData.size || '');
                setBrand(initialData.brand || '');
                setModel(initialData.model || '');
                setState(initialData.state || 'Bueno');
                setObservations(initialData.observations || '');
                setSelectedFirefighter(initialData.firefighter || null);
            } else {
                resetForm();
            }
        }
    }, [open, initialData, resetForm]);

    const handleAutoGenerateCode = async () => {
        if (!categoryId || !subCategoryId || !itemTypeId) {
            toast({ title: "Faltan datos", description: "Seleccione una clasificación completa antes de generar el código." });
            return;
        }
        setGeneratingCode(true);
        try {
            const prefix = `${categoryId}${subCategoryId.split('.').pop()}${itemTypeId.split('.').pop()}`;
            const sequence = await getNextClothingSequence(prefix);
            const formattedCode = `${prefix}${sequence.toString().padStart(3, '0')}`;
            setCode(formattedCode);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo generar el código." });
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

        setLoading(true);
        try {
            const selectedItemTypeLabel = itemTypes.find(i => i.id === itemTypeId)?.label || 'Prenda';
            // Extract the label part from "01.1.1 Label"
            const finalTypeLabel = selectedItemTypeLabel.split(' ').slice(1).join(' ');

            const dataToSave: Omit<ClothingItem, 'id' | 'firefighter'> = {
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
                firefighterId: selectedFirefighter?.id,
                deliveredAt: selectedFirefighter ? new Date().toISOString() : undefined,
            };

            await addClothingItem(dataToSave, actor);
            toast({ title: "¡Éxito!", description: "La prenda ha sido agregada al inventario." });
            onSave();
            resetForm();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al agregar", description: error.message });
        } finally {
            setLoading(false);
        }
    };
    
    const isCloning = !!initialData;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline">{isCloning ? `Clonar Prenda "${initialData.type}"` : 'Agregar Prenda al Inventario'}</DialogTitle>
                    <DialogDescription>
                        {isCloning ? 'Complete un nuevo código único. El resto de los datos han sido copiados.' : 'Complete los detalles de la nueva prenda.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4 space-y-4 py-4">
                    
                    <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Clasificación Operativa</Label>
                        <div className="grid grid-cols-1 gap-2">
                            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubCategoryId(''); setItemTypeId(''); }}>
                                <SelectTrigger><SelectValue placeholder="1. Categoría Principal" /></SelectTrigger>
                                <SelectContent>{CLOTHING_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={subCategoryId} onValueChange={(v) => { setSubCategoryId(v); setItemTypeId(''); }} disabled={!categoryId}>
                                <SelectTrigger><SelectValue placeholder="2. Subcategoría" /></SelectTrigger>
                                <SelectContent>{subCategories.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={itemTypeId} onValueChange={setItemTypeId} disabled={!subCategoryId}>
                                <SelectTrigger><SelectValue placeholder="3. Tipo de Prenda" /></SelectTrigger>
                                <SelectContent>{itemTypes.map(i => <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Código</Label>
                            <div className="flex gap-2">
                                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="0000000" className="font-mono" />
                                <Button type="button" variant="outline" size="icon" onClick={handleAutoGenerateCode} disabled={generatingCode || !itemTypeId}>
                                    {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="size">Talle</Label><Input id="size" value={size} onChange={(e) => setSize(e.target.value)} required placeholder="Ej: L, 42, XL" /></div>
                        <div className="space-y-2"><Label>Estado</Label><Select value={state} onValueChange={(v) => setState(v as any)} required><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent>{clothingStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="brand">Marca</Label><Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Opcional" /></div>
                        <div className="space-y-2"><Label htmlFor="model">Modelo</Label><Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Opcional" /></div>

                        <div className="space-y-2 md:col-span-3">
                            <Label>Asignar a Integrante (Opcional)</Label>
                             <Popover open={firefighterComboboxOpen} onOpenChange={setFirefighterComboboxOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={firefighterComboboxOpen} className="w-full justify-between h-auto min-h-10">
                                        {selectedFirefighter ? `${selectedFirefighter.legajo} - ${selectedFirefighter.lastName}, ${selectedFirefighter.firstName}` : "Seleccionar por legajo o nombre..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar por legajo o nombre..." />
                                        <CommandList><CommandEmpty>No se encontraron integrantes.</CommandEmpty>
                                        <CommandItem onSelect={() => { setSelectedFirefighter(null); setFirefighterComboboxOpen(false); }}>
                                            <Check className={cn("mr-2 h-4 w-4", !selectedFirefighter ? "opacity-100" : "opacity-0")} />
                                            Dejar en Depósito
                                        </CommandItem>
                                        <CommandGroup>
                                            {activeFirefighters.map((firefighter) => (
                                                <CommandItem key={firefighter.id} value={`${firefighter.legajo} ${firefighter.lastName} ${firefighter.firstName}`} onSelect={() => { setSelectedFirefighter(firefighter); setFirefighterComboboxOpen(false); }}>
                                                    <Check className={cn("mr-2 h-4 w-4", selectedFirefighter?.id === firefighter.id ? "opacity-100" : "opacity-0")} />
                                                    {`${firefighter.legajo} - ${firefighter.lastName}, ${firefighter.firstName}`}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup></CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                         <div className="space-y-2 md:col-span-3">
                            <Label htmlFor="observations">Observaciones</Label>
                            <Textarea id="observations" value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Detalles de la entrega, estado, etc."/>
                        </div>
                    </div>
                </form>
                <DialogFooter className="border-t pt-4"><Button onClick={handleSubmit} disabled={loading}>{loading ? <Loader2 className="animate-spin mr-2"/> : null} {loading ? "Guardando..." : "Guardar Prenda"}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
