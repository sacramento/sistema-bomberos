
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
import { useState, useEffect } from "react";
import { Firefighter, Session } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { getFirefighters } from "@/services/firefighters.service";
import { addSession } from "@/services/sessions.service";

const specializations = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE', 'VARIOS'];

const hierarchyOptions = [
    { value: 'aspirantes', label: 'Aspirantes' },
    { value: 'bomberos', label: 'Bomberos' },
    { value: 'suboficiales_oficiales', label: 'Suboficiales y Oficiales' }
];

const stationOptions = [
    { value: 'Cuartel 1', label: 'Cuartel 1' },
    { value: 'Cuartel 2', label: 'Cuartel 2' },
    { value: 'Cuartel 3', label: 'Cuartel 3' },
];

const MultiSelectFirefighter = ({ 
    title, 
    selected, 
    onSelectedChange,
    firefighters
}: { 
    title: string;
    selected: Firefighter[]; 
    onSelectedChange: (selected: Firefighter[]) => void;
    firefighters: Firefighter[];
}) => {
    const [open, setOpen] = useState(false);
    // Exclude Aspirantes from being selected as instructors or assistants
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
                            selected.map(f => <Badge variant="secondary" key={f.id}>{`${f.firstName} ${f.lastName}`}</Badge>)
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
                                    value={`${firefighter.firstName} ${firefighter.lastName}`}
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
                                    {firefighter.rank} - {`${firefighter.firstName} ${firefighter.lastName}`}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const MultiSelectFilter = ({
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
    
    const selectedLabels = selected.map(s => options.find(o => o.value === s)?.label);

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
                            selectedLabels.map(label => <Badge variant="secondary" key={label}>{label}</Badge>)
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
                        <CommandEmpty>No se encontraron opciones.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => {
                                        handleSelect(option.value);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selected.includes(option.value) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
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


export default function AddClassDialog({ children, onClassAdded }: { children: React.ReactNode; onClassAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // All firefighters from DB
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [specialization, setSpecialization] = useState<Session['specialization'] | ''>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [instructors, setInstructors] = useState<Firefighter[]>([]);
  const [assistants, setAssistants] = useState<Firefighter[]>([]);
  const [selectedHierarchies, setSelectedHierarchies] = useState<string[]>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);

  useEffect(() => {
    const fetchAllFirefighters = async () => {
        if (open) { // Fetch only when dialog is open
            try {
                const data = await getFirefighters();
                setAllFirefighters(data);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los bomberos para la selección.",
                    variant: "destructive"
                });
            }
        }
    };
    fetchAllFirefighters();
  }, [open, toast]);


  const getAttendees = (): Firefighter[] => {
    let filtered = allFirefighters;

    // Filter by Hierarchy
    if (selectedHierarchies.length > 0) {
        const suboficialRanks = ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR'];
        const oficialRanks = ['OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'];
        
        filtered = filtered.filter(f => {
            if (selectedHierarchies.includes('aspirantes') && f.rank === 'ASPIRANTE') return true;
            if (selectedHierarchies.includes('bomberos') && f.rank === 'BOMBERO') return true;
            if (selectedHierarchies.includes('suboficiales_oficiales') && [...suboficialRanks, ...oficialRanks].includes(f.rank)) return true;
            return false;
        });
    }
    
    // Filter by Station
    if (selectedStations.length > 0) {
        filtered = filtered.filter(f => selectedStations.includes(f.firehouse));
    }
    
    // Exclude instructors and assistants from attendees
    const instructorIds = new Set(instructors.map(i => i.id));
    const assistantIds = new Set(assistants.map(a => a.id));

    return filtered.filter(f => !instructorIds.has(f.id) && !assistantIds.has(f.id));
  };
  
  const resetForm = () => {
    setTitle('');
    setSpecialization('');
    setDescription('');
    setDate('');
    setTime('');
    setInstructors([]);
    setAssistants([]);
    setSelectedHierarchies([]);
    setSelectedStations([]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    if (!title || !specialization || !date || !time || instructors.length === 0) {
        toast({
            title: "Error",
            description: "Por favor, complete todos los campos obligatorios.",
            variant: "destructive",
        });
        setLoading(false);
        return;
    }
    
    const attendees = getAttendees();

    if (attendees.length === 0) {
         toast({
            title: "Sin asistentes",
            description: "No se encontraron bomberos que coincidan con los filtros de asignación. La clase no fue creada.",
            variant: "destructive",
        });
        setLoading(false);
        return;
    }
    
    try {
        const newClassData: Omit<Session, 'id'> = {
            title,
            specialization: specialization as Session['specialization'],
            description,
            date,
            startTime: time,
            instructors,
            assistants,
            attendees,
        };
        
        await addSession(newClassData);

        toast({
            title: "¡Éxito!",
            description: `La nueva clase ha sido creada con ${attendees.length} asistentes.`,
        });
        
        onClassAdded();
        resetForm();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error",
            description: error.message || "No se pudo crear la clase.",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
    }}>
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
                    <Input id="title" placeholder="Ej: RCP y Primeros Auxilios" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="specialization">Especialidad</Label>
                    <Select onValueChange={(value) => setSpecialization(value as Session['specialization'])} value={specialization} required>
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
                    <Textarea id="description" placeholder="Describa brevemente la clase..." value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="time">Hora de Inicio</Label>
                    <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="instructor">Instructores</Label>
                     <MultiSelectFirefighter title="Instructores" selected={instructors} onSelectedChange={setInstructors} firefighters={allFirefighters} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="assistant">Ayudantes (Opcional)</Label>
                    <MultiSelectFirefighter title="Ayudantes" selected={assistants} onSelectedChange={setAssistants} firefighters={allFirefighters} />
                </div>
            </div>

            {/* Attendee Selection */}
            <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-lg font-headline">Asignar Asistentes</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                     <div className="space-y-2">
                        <Label>Seleccionar por Jerarquía</Label>
                        <MultiSelectFilter
                            title="Jerarquías"
                            options={hierarchyOptions}
                            selected={selectedHierarchies}
                            onSelectedChange={setSelectedHierarchies}
                         />
                    </div>
                    <div className="space-y-2">
                         <Label>Seleccionar por Cuartel</Label>
                         <MultiSelectFilter
                            title="Cuarteles"
                            options={stationOptions}
                            selected={selectedStations}
                            onSelectedChange={setSelectedStations}
                         />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                    Si no se selecciona ninguna jerarquía o cuartel, se incluirán todos los bomberos por defecto (excluyendo instructores y ayudantes).
                </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Clase'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
