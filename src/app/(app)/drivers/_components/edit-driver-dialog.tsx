
'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Firefighter, Driver, Habilitacion } from "@/lib/types";
import { updateDriver } from "@/services/drivers.service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

const habilitaciones: Habilitacion[] = ['Practica', 'Liviana', 'Pesada', 'Timonel'];

const MultiSelect = ({
    title,
    options,
    selected,
    onSelectedChange
}: {
    title: string;
    options: { value: string; label: string }[];
    selected: string[];
    onSelectedChange: (selected: string[]) => void;
}) => {
    const [open, setOpen] = useState(false);
    const handleSelect = (value: string) => {
        const isSelected = selected.includes(value);
        if (isSelected) {
            onSelectedChange(selected.filter(s => s !== value));
        } else {
            onSelectedChange([...selected, value]);
        }
    };
    
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-10">
                    <div className="flex gap-1 flex-wrap">
                         {selected.length > 0 ? (
                            selected.map(value => <Badge variant="secondary" key={value}>{value}</Badge>)
                        ) : (
                            `Seleccionar ${title.toLowerCase()}...`
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Buscar...`} />
                    <CommandList>
                        <CommandEmpty>No se encontraron opciones.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem key={option.value} value={option.label} onSelect={() => handleSelect(option.value)}>
                                    <Check className={cn("mr-2 h-4 w-4", selected.includes(option.value) ? "opacity-100" : "opacity-0")} />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


export default function EditDriverDialog({ children, driver, onDriverUpdated }: { children: React.ReactNode; driver: Driver; onDriverUpdated: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [selectedHabilitaciones, setSelectedHabilitaciones] = useState<Habilitacion[]>([]);
  
  useEffect(() => {
    if (open) {
        setSelectedHabilitaciones(driver.habilitaciones || []);
    }
  }, [open, driver]);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedHabilitaciones.length === 0) {
        toast({
            title: "Error",
            description: "Debe seleccionar al menos una habilitación.",
            variant: "destructive",
        });
        return;
    }
    
    setLoading(true);

    try {
        const updatedDriverData: Partial<Omit<Driver, 'id' | 'firefighter' | 'firefighterId'>> = {
            habilitaciones: selectedHabilitaciones
        };
        
        await updateDriver(driver.id, updatedDriverData, {});

        toast({
            title: "¡Éxito!",
            description: `Las habilitaciones del chofer ${driver.firefighter?.lastName} han sido actualizadas.`,
        });
        
        onDriverUpdated();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error",
            description: error.message || "No se pudo actualizar el chofer.",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Editar Habilitaciones de Chofer</DialogTitle>
            <DialogDescription>
                {driver.firefighter ? `${driver.firefighter.lastName}, ${driver.firefighter.firstName}` : 'Chofer desconocido'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label>Habilitaciones</Label>
                <MultiSelect 
                    title="Habilitaciones"
                    options={habilitaciones.map(h => ({ value: h, label: h }))}
                    selected={selectedHabilitaciones}
                    onSelectedChange={(s) => setSelectedHabilitaciones(s as Habilitacion[])}
                />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : null} {loading ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
