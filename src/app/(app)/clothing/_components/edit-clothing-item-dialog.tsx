
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import { ClothingItem, Firefighter, ClothingCategory, ClothingSubCategory, ClothingItemType } from "@/lib/types";
import { updateClothingItem } from "@/services/clothing.service";
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
    'Mameluco', 'Borcegos', 'Pantalon', 'Remera', 'Tricota', 'Gorra', 
    'Camisa', 'Campera', 'Borceguies', 'Gorro', 'Corbata', 'Cinto',
    'Casco', 'Chaqueton', 'Pantalon de Incendio', 'Botas', 'Guantes', 'Esclavina'
];

interface EditClothingItemDialogProps {
    children: React.ReactNode;
    onSave: () => void;
    firefighters: Firefighter[];
    item: ClothingItem;
}

export default function EditClothingItemDialog({ children, onSave, firefighters, item }: EditClothingItemDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<Omit<ClothingItem, 'id' | 'firefighter'>>>({});
    const [selectedFirefighter, setSelectedFirefighter] = useState<Firefighter | null>(null);
    const [firefighterComboboxOpen, setFirefighterComboboxOpen] = useState(false);

    useEffect(() => {
        if(open) {
            setFormData({
                code: item.code,
                category: item.category,
                subCategory: item.subCategory,
                type: item.type,
                size: item.size,
                state: item.state,
                firefighterId: item.firefighterId,
                deliveredAt: item.deliveredAt,
            });
            setSelectedFirefighter(item.firefighter || null);
        }
    }, [open, item]);


    const handleInputChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCategoryChange = (value: ClothingCategory) => {
        setFormData(prev => ({ ...prev, category: value, subCategory: undefined, type: undefined }));
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
            const previousFirefighterId = item.firefighterId;
            const newFirefighterId = selectedFirefighter?.id;
            
            const dataToUpdate: Partial<Omit<ClothingItem, 'id' | 'firefighter'>> = {
                ...formData,
                firefighterId: newFirefighterId,
                // Only update delivery date if the firefighter changes to a new one
                deliveredAt: newFirefighterId && newFirefighterId !== previousFirefighterId ? new Date().toISOString() : formData.deliveredAt,
            };

            await updateClothingItem(item.id, dataToUpdate);
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
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline">Editar Prenda</DialogTitle>
                    <DialogDescription>Modifique los detalles de la prenda.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4 space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="code-edit">Código (Único)</Label><Input id="code-edit" value={formData.code || ''} onChange={(e) => handleInputChange('code', e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="size-edit">Talle</Label><Input id="size-edit" value={formData.size || ''} onChange={(e) => handleInputChange('size', e.target.value)} required /></div>
                        
                        <div className="space-y-2"><Label>Categoría</Label><Select value={formData.category} onValueChange={(v) => handleCategoryChange(v as any)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{clothingCategories.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Sub-Categoría</Label><Select value={formData.subCategory} onValueChange={(v) => handleInputChange('subCategory', v as any)} disabled={!formData.category}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableSubCategories.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2 md:col-span-2"><Label>Tipo de Prenda</Label><Select value={formData.type} onValueChange={(v) => handleInputChange('type', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allItemTypes.sort().map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        
                        <div className="space-y-2"><Label>Estado</Label><Select value={formData.state} onValueChange={(v) => handleInputChange('state', v as any)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{clothingStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div className="space-y-2">
                        <Label>Asignar a Bombero (Opcional)</Label>
                         <Popover open={firefighterComboboxOpen} onOpenChange={setFirefighterComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={firefighterComboboxOpen} className="w-full justify-between">
                                    {selectedFirefighter ? `${selectedFirefighter.lastName}, ${selectedFirefighter.firstName}` : "Dejar en Depósito"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar bombero..." />
                                    <CommandList><CommandEmpty>No se encontraron bomberos.</CommandEmpty>
                                    <CommandItem onSelect={() => setSelectedFirefighter(null)}>
                                        <Check className={cn("mr-2 h-4 w-4", !selectedFirefighter ? "opacity-100" : "opacity-0")} />
                                        Dejar en Depósito
                                    </CommandItem>
                                    <CommandGroup>
                                        {firefighters.map((firefighter) => (
                                            <CommandItem key={firefighter.id} value={`${firefighter.lastName} ${firefighter.firstName}`} onSelect={() => { setSelectedFirefighter(firefighter); setFirefighterComboboxOpen(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", selectedFirefighter?.id === firefighter.id ? "opacity-100" : "opacity-0")} />
                                                {`${firefighter.lastName}, ${firefighter.firstName}`}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup></CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </form>
                <DialogFooter className="border-t pt-4"><Button onClick={handleSubmit} disabled={loading}>{loading ? <Loader2 className="animate-spin mr-2"/> : null} {loading ? "Guardando..." : "Guardar Cambios"}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
