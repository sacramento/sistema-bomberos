
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
import { getFirefighters } from "@/services/firefighters.service";
import { addDriver, getDrivers } from "@/services/drivers.service";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { SingleFirefighterSelect, MultiFirefighterSelect } from "@/components/firefighter-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const habilitaciones: Habilitacion[] = ['Practica', 'Liviana', 'Pesada', 'Timonel'];

const MultiStringSelect = ({
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
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-10 text-left">
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

export default function AddDriverDialog({ children, onDriverAdded }: { children: React.ReactNode; onDriverAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user: actor } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  
  const [availableFirefighters, setAvailableFirefighters] = useState<Firefighter[]>([]);
  const [selectedFirefighter, setSelectedFirefighter] = useState<Firefighter | null>(null);
  const [selectedHabilitaciones, setSelectedHabilitaciones] = useState<Habilitacion[]>([]);

  useEffect(() => {
    const fetchAvailableFirefighters = async () => {
        if (open) {
            setDataLoading(true);
            try {
                const [allFirefighters, allDrivers] = await Promise.all([getFirefighters(), getDrivers()]);
                const existingDriverIds = new Set(allDrivers.map(d => d.firefighterId));
                const available = allFirefighters.filter(f => !existingDriverIds.has(f.id) && (f.status === 'Active' || f.status === 'Auxiliar'));
                setAvailableFirefighters(available);
            } catch (error) {
                 toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
            } finally {
                setDataLoading(false);
            }
        }
    };
    fetchAvailableFirefighters();
  }, [open, toast]);


  const resetForm = () => {
    setSelectedFirefighter(null);
    setSelectedHabilitaciones([]);
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFirefighter || selectedHabilitaciones.length === 0 || !actor) {
        toast({ title: "Error", description: "Complete todos los campos requeridos.", variant: "destructive" });
        return;
    }
    
    setLoading(true);
    try {
        const newDriverData: Omit<Driver, 'id' | 'firefighter'> = {
            firefighterId: selectedFirefighter.id,
            habilitaciones: selectedHabilitaciones
        };
        await addDriver(newDriverData, actor);
        toast({ title: "¡Éxito!", description: "Chofer agregado correctamente." });
        onDriverAdded();
        setOpen(false);
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Agregar Nuevo Chofer</DialogTitle>
            <DialogDescription>Asigne habilitaciones de conducción a un integrante.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label>Integrante</Label>
                <SingleFirefighterSelect 
                    title="Integrante" 
                    selected={selectedFirefighter} 
                    onSelectedChange={setSelectedFirefighter} 
                    firefighters={availableFirefighters}
                    disabled={dataLoading}
                />
            </div>
            <div className="space-y-2">
                <Label>Habilitaciones</Label>
                <MultiStringSelect 
                    title="Habilitaciones"
                    options={habilitaciones.map(h => ({ value: h, label: h }))}
                    selected={selectedHabilitaciones}
                    onSelectedChange={(s) => setSelectedHabilitaciones(s as Habilitacion[])}
                />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || dataLoading}>
                {loading && <Loader2 className="animate-spin mr-2 h-4 w-4"/>} 
                Guardar Chofer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
