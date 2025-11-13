
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { ClothingItem, Firefighter, ClothingCategory, ClothingSubCategory, ClothingItemType } from "@/lib/types";
import { addClothingItem } from "@/services/clothing.service";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const clothingCategories: ClothingCategory[] = ['Fajina', 'Media Gala', 'Servicios'];
const clothingStates: ClothingItem['state'][] = ['Nuevo', 'Bueno', 'Regular', 'Malo', 'Baja'];

const subCategoriesByCategory: Record<ClothingCategory, ClothingSubCategory[]> = {
    'Fajina': ['General'],
    'Media Gala': ['General'],
    'Servicios': ['Incendio', 'Rescate', 'Forestal', 'GORA', 'Buceo']
};

const allItemTypes: ClothingItemType[] = [
    'Mameluco', 'Borcegos', 'Pantalon', 'Remera', 'Tricota',
    'Camisa', 'Campera', 'Gorro', 'Corbata', 'Cinto',
    'Casco', 'Chaqueton', 'Pantalon de Incendio', 'Botas', 'Guantes', 'Esclavina'
];

interface AddClothingItemDialogProps {
    children: React.ReactNode;
    onSave: () => void;
    firefighters: Firefighter[];
}

export default function AddClothingItemDialog({ children, onSave, firefighters }: AddClothingItemDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<Omit<ClothingItem, 'id' | 'firefighter'>>>({ state: 'Bueno' });
    const [selectedFirefighter, setSelectedFirefighter] = useState<Firefighter | null>(null);
    const [firefighterComboboxOpen, setFirefighterComboboxOpen] = useState(false);

    const resetForm = () => {
        setFormData({ state: 'Bueno' });
        setSelectedFirefighter(null);
    };

    const handleInputChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCategoryChange = (value: ClothingCategory) => {
        setFormData(prev => ({ ...prev, category: value, subCategory: undefined, type: prev.type }));
    }

    const availableSubCategories = useMemo(() => {
        return formData.category ? subCategoriesByCategory[formData.category] : [];
    }, [formData.category]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.code || !formData.category || !formData.subCategory || !formData.type || !formData.size || !formData.state) {
            toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor, complete todos los campos requeridos." });
            return;
        }

        setLoading(true);
        try {
            const dataToSave: Omit<ClothingItem, 'id' | 'firefighter'> = {
                code: formData.code,
                category: formData.category,
                subCategory: formData.subCategory,
                type: formData.type,
                size: formData.size,
                brand: formData.brand,
                model: formData.model,
                observations: formData.observations,
                state: formData.state,
                firefighterId: selectedFirefighter?.id,
                deliveredAt: selectedFirefighter ? new Date().toISOString() : undefined,
            };

            await addClothingItem(dataToSave);
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

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline">Agregar Prenda al Inventario</DialogTitle>
                    <DialogDescription>Complete los detalles de la nueva prenda.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4 space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label htmlFor="code">Código (Único)</Label><Input id="code" value={formData.code || ''} onChange={(e) => handleInputChange('code', e.target.value)} required /></div>
                        <div className="space-y-2"><Label>Categoría</Label><Select value={formData.category} onValueChange={(v) => handleCategoryChange(v as any)} required><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent>{clothingCategories.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Sub-Categoría</Label><Select value={formData.subCategory} onValueChange={(v) => handleInputChange('subCategory', v as any)} disabled={!formData.category} required><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent>{availableSubCategories.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Tipo de Prenda</Label><Select value={formData.type} onValueChange={(v) => handleInputChange('type', v as any)} required><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent>{allItemTypes.sort().map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="size">Talle</Label><Input id="size" value={formData.size || ''} onChange={(e) => handleInputChange('size', e.target.value)} required /></div>
                        <div className="space-y-2"><Label>Estado</Label><Select value={formData.state} onValueChange={(v) => handleInputChange('state', v as any)} required><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent>{clothingStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="brand">Marca (Opcional)</Label><Input id="brand" value={formData.brand || ''} onChange={(e) => handleInputChange('brand', e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="model">Modelo (Opcional)</Label><Input id="model" value={formData.model || ''} onChange={(e) => handleInputChange('model', e.target.value)} /></div>

                        <div className="space-y-2 md:col-span-3">
                            <Label>Asignar a Bombero (Opcional)</Label>
                             <Popover open={firefighterComboboxOpen} onOpenChange={setFirefighterComboboxOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={firefighterComboboxOpen} className="w-full justify-between">
                                        {selectedFirefighter ? `${selectedFirefighter.legajo} - ${selectedFirefighter.lastName}, ${selectedFirefighter.firstName}` : "Seleccionar bombero (o dejar en Depósito)..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar por nombre o legajo..." />
                                        <CommandList><CommandEmpty>No se encontraron bomberos.</CommandEmpty>
                                        <CommandItem onSelect={() => { setSelectedFirefighter(null); setFirefighterComboboxOpen(false); }}>
                                            <Check className={cn("mr-2 h-4 w-4", !selectedFirefighter ? "opacity-100" : "opacity-0")} />
                                            Dejar en Depósito
                                        </CommandItem>
                                        <CommandGroup>
                                            {firefighters.map((firefighter) => (
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
                            <Label htmlFor="observations">Observaciones (Opcional)</Label>
                            <Textarea id="observations" value={formData.observations || ''} onChange={(e) => handleInputChange('observations', e.target.value)} placeholder="Detalles de la entrega, estado, etc."/>
                        </div>
                    </div>
                </form>
                <DialogFooter className="border-t pt-4"><Button onClick={handleSubmit} disabled={loading}>{loading ? <Loader2 className="animate-spin mr-2"/> : null} {loading ? "Guardando..." : "Guardar Prenda"}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
