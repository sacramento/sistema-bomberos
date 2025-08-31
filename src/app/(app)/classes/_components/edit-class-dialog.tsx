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
import { updateSession } from "@/services/sessions.service";

const specializations = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE', 'VARIOS'];


const MultiSelectFirefighter = ({ 
    title, 
    selected, 
    onSelectedChange,
    firefighters,
    excludeAspirantes = false
}: { 
    title: string;
    selected: Firefighter[]; 
    onSelectedChange: (selected: Firefighter[]) => void;
    firefighters: Firefighter[];
    excludeAspirantes?: boolean;
}) => {
    const [open, setOpen] = useState(false);
    
    const availableFirefighters = excludeAspirantes 
        ? firefighters.filter(f => f.rank !== 'ASPIRANTE') 
        : firefighters;

    const handleSelect = (firefighter: Firefighter) => {
        const isSelected = selected.some(s => s.id === firefighter.id);
        if (isSelected) {
            onSelectedChange(selected.filter(s => s.id !== firefighter.id));
        } else {
            onSelectedChange([...selected, firefighter]);
        }
    };
    
    const getDisplayText = (f: Firefighter) => `${f.id} - ${f.lastName}`;

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
                            selected.map(f => <Badge variant="secondary" key={f.id}>{getDisplayText(f)}</Badge>)
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
                                    value={`${firefighter.id} ${firefighter.firstName} ${firefighter.lastName}`}
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
                                    {`${firefighter.id} - ${firefighter.firstName} ${firefighter.lastName}`}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


export default function EditClassDialog({ children, session, onClassUpdated }: { children: React.ReactNode; session: Session, onClassUpdated: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // All firefighters from DB
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  
  // Form state
  const [title, setTitle] = useState(session.title);
  const [specialization, setSpecialization] = useState<Session['specialization']>(session.specialization);
  const [description, setDescription] = useState(session.description);
  const [date, setDate] = useState(session.date);
  const [time, setTime] = useState(session.startTime);
  const [instructors, setInstructors] = useState<Firefighter[]>(session.instructors);
  const [assistants, setAssistants] = useState<Firefighter[]>(session.assistants);
  
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
  
  const resetForm = () => {
    setTitle(session.title);
    setSpecialization(session.specialization);
    setDescription(session.description);
    setDate(session.date);
    setTime(session.startTime);
    setInstructors(session.instructors);
    setAssistants(session.assistants);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    if (!title || !specialization || !date || !time || instructors.length === 0) {
       toast({ title: "Campos incompletos", description: "Por favor, complete todos los detalles de la clase.", variant: "destructive" });
       setLoading(false);
       return;
    }
    
    try {
        const updatedData: Partial<Omit<Session, 'id' | 'attendees'>> = {
            title,
            specialization,
            description,
            date,
            startTime: time,
            instructors,
            assistants,
        };
        
        await updateSession(session.id, updatedData);

        toast({
            title: "¡Éxito!",
            description: "La clase ha sido actualizada.",
        });
        
        onClassUpdated();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error",
            description: error.message || "No se pudo actualizar la clase.",
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
        <DialogContent className="sm:max-w-xl">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle className="font-headline">Editar Clase</DialogTitle>
                    <DialogDescription>
                        Modifique los detalles de la clase. No puede editar los asistentes desde aquí.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="specialization">Especialidad</Label>
                        <Select onValueChange={(value) => setSpecialization(value as Session['specialization'])} value={specialization} required>
                            <SelectTrigger><SelectValue placeholder="Seleccione una especialidad" /></SelectTrigger>
                            <SelectContent>
                            {specializations.map(spec => <SelectItem key={spec} value={spec}>{spec}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Fecha</Label>
                        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="time">Hora de Inicio</Label>
                        <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                    </div>
                     <div className="col-span-1 md:col-span-2 space-y-2">
                        <Label>Instructores</Label>
                        <MultiSelectFirefighter title="Instructores" selected={instructors} onSelectedChange={setInstructors} firefighters={allFirefighters} excludeAspirantes={true} />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <Label>Ayudantes (Opcional)</Label>
                        <MultiSelectFirefighter title="Ayudantes" selected={assistants} onSelectedChange={setAssistants} firefighters={allFirefighters} excludeAspirantes={true} />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}
