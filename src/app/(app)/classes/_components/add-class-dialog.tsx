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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { firefighters } from "@/lib/data";
import { useState } from "react";
import { Firefighter } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

const specializations = ['General', 'MatPel', 'Médica', 'Rescate'];

const MultiSelectFirefighter = ({ 
    title, 
    selected, 
    onSelectedChange 
}: { 
    title: string;
    selected: Firefighter[]; 
    onSelectedChange: (selected: Firefighter[]) => void;
}) => {
    const [open, setOpen] = useState(false);
    const availableFirefighters = firefighters.filter(f => f.rank !== 'ASPIRANTE');

    const handleSelect = (firefighter: Firefighter) => {
        const isSelected = selected.some(s => s.id === firefighter.id);
        if (isSelected) {
            onSelectedChange(selected.filter(s => s.id !== firefighter.id));
        } else {
            onSelectedChange([...selected, firefighter]);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto"
                >
                    <div className="flex gap-1 flex-wrap">
                        {selected.length > 0 ? (
                            selected.map(f => <Badge variant="secondary" key={f.id}>{f.name}</Badge>)
                        ) : (
                            `Seleccionar ${title.toLowerCase()}...`
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Buscar ${title.toLowerCase()}...`} />
                    <CommandList>
                        <CommandEmpty>No se encontraron bomberos.</CommandEmpty>
                        <CommandGroup>
                            {availableFirefighters.map((firefighter) => (
                                <CommandItem
                                    key={firefighter.id}
                                    value={firefighter.name}
                                    onSelect={() => {
                                        handleSelect(firefighter);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selected.some(s => s.id === firefighter.id) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {firefighter.rank} - {firefighter.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default function AddClassDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [instructors, setInstructors] = useState<Firefighter[]>([]);
  const [assistants, setAssistants] = useState<Firefighter[]>([]);


  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Logic to add class would go here
    toast({
        title: "¡Éxito!",
        description: "La nueva clase ha sido creada.",
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Crear Nueva Clase</DialogTitle>
            <DialogDescription>
              Complete los detalles de la nueva clase de capacitación.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Class Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input id="title" placeholder="Ej: RCP y Primeros Auxilios" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="specialization">Especialidad</Label>
                    <Select>
                        <SelectTrigger>
                        <SelectValue placeholder="Seleccione una especialidad" />
                        </SelectTrigger>
                        <SelectContent>
                        {specializations.map(spec => (
                            <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea id="description" placeholder="Describa brevemente la clase..." />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input id="date" type="date" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="time">Hora de Inicio</Label>
                    <Input id="time" type="time" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="instructor">Instructores</Label>
                     <MultiSelectFirefighter title="Instructores" selected={instructors} onSelectedChange={setInstructors} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="assistant">Ayudantes (Opcional)</Label>
                    <MultiSelectFirefighter title="Ayudantes" selected={assistants} onSelectedChange={setAssistants} />
                </div>
            </div>

            {/* Attendee Selection */}
            <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-lg font-headline">Asignar Asistentes</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                     <div className="space-y-2">
                         <Label>Seleccionar por Jerarquía</Label>
                         <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar jerarquía" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all-ranks">Todos</SelectItem>
                                <SelectItem value="bomberos">Solo Bomberos</SelectItem>
                                <SelectItem value="oficiales">Solo Suboficiales y Oficiales</SelectItem>
                            </SelectContent>
                         </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Seleccionar por Estación</Label>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar estación" />
                            </SelectTrigger>
                            <SelectContent>
                               <SelectItem value="all-stations">Todos las Estaciones</SelectItem>
                               <SelectItem value="station-1">Estación 1</SelectItem>
                               <SelectItem value="station-2">Estación 2</SelectItem>
                               <SelectItem value="station-3">Estación 3</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Guardar Clase</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
