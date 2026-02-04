
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
import { useState, useEffect, useMemo } from "react";
import { Firefighter, Session } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, ArrowRight, ArrowLeft } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { getFirefighters } from "@/services/firefighters.service";
import { addAspiranteSession } from "@/services/aspirantes-sessions.service";
import { Progress } from "@/components/ui/progress";

const specializations: Session['specialization'][] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'VARIOS'];

const MultiSelectFirefighter = ({ 
    title, 
    selected, 
    onSelectedChange,
    firefighters,
}: { 
    title: string;
    selected: Firefighter[]; 
    onSelectedChange: (selected: Firefighter[]) => void;
    firefighters: Firefighter[];
}) => {
    const [open, setOpen] = useState(false);
    
    const handleSelect = (firefighter: Firefighter) => {
        const isSelected = selected.some(s => s.id === firefighter.id);
        if (isSelected) {
            onSelectedChange(selected.filter(s => s.id !== firefighter.id));
        } else {
            onSelectedChange([...selected, firefighter]);
        }
    };
    
    const getDisplayText = (f: Firefighter) => `${f.legajo} - ${f.lastName}`;

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
                            {firefighters.map((firefighter) => (
                                <CommandItem
                                    key={firefighter.id}
                                    value={`${firefighter.legajo} ${firefighter.firstName} ${firefighter.lastName}`}
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
                                    {`${firefighter.legajo} - ${firefighter.firstName} ${firefighter.lastName}`}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


export default function AddAspiranteClassDialog({ children, onClassAdded }: { children: React.ReactNode; onClassAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [specialization, setSpecialization] = useState<Session['specialization'] | ''>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [instructors, setInstructors] = useState<Firefighter[]>([]);
  const [assistants, setAssistants] = useState<Firefighter[]>([]);
  const [attendees, setAttendees] = useState<Firefighter[]>([]);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const activeFirefighters = useMemo(() => allFirefighters.filter(f => f.status === 'Active' || f.status === 'Auxiliar'), [allFirefighters]);
  const aspirantes = useMemo(() => activeFirefighters.filter(f => f.rank === 'ASPIRANTE'), [activeFirefighters]);
  const instructorsAndAssistants = useMemo(() => activeFirefighters.filter(f => f.rank !== 'ASPIRANTE'), [activeFirefighters]);

  useEffect(() => {
    const fetchAllFirefighters = async () => {
        if (open) {
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

  useEffect(() => {
    if (step === 4) {
        const instructorIds = new Set(instructors.map(i => i.id));
        const assistantIds = new Set(assistants.map(a => a.id));
        setAttendees(attendees.filter(f => !instructorIds.has(f.id) && !assistantIds.has(f.id)));
    }
  }, [step, attendees, instructors, assistants]);
  
  const resetForm = () => {
    setTitle('');
    setSpecialization('');
    setDescription('');
    setDate('');
    setTime('');
    setInstructors([]);
    setAssistants([]);
    setAttendees([]);
    setStep(1);
  };

  const handleNext = () => {
    if (step === 1 && (!title || !specialization || !date || !time)) {
      toast({ title: "Campos incompletos", description: "Por favor, complete todos los detalles de la clase.", variant: "destructive" });
      return;
    }
    if (step === 2 && instructors.length === 0) {
      toast({ title: "Sin instructores", description: "Debe seleccionar al menos un instructor.", variant: "destructive" });
      return;
    }
    if (step === 3 && attendees.length === 0) {
      toast({ title: "Sin asistentes", description: "Debe seleccionar al menos un aspirante.", variant: "destructive" });
      return;
    }
    setStep(s => Math.min(s + 1, totalSteps));
  };
  const handleBack = () => setStep(s => Math.max(s - 1, 1));


  const handleSubmit = async () => {
    setLoading(true);
    
    if (attendees.length === 0) {
         toast({
            title: "Sin asistentes",
            description: "No se puede crear una clase sin aspirantes.",
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
        
        await addAspiranteSession(newClassData);

        toast({
            title: "¡Éxito!",
            description: `La nueva clase para aspirantes ha sido creada.`,
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
  
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" placeholder="Ej: RCP y Primeros Auxilios" value={title} onChange={(e) => setTitle(e.target.value)} required />
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
              <Textarea id="description" placeholder="Describa brevemente la clase..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora de Inicio</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instructor">Instructores</Label>
              <MultiSelectFirefighter title="Instructores" selected={instructors} onSelectedChange={setInstructors} firefighters={instructorsAndAssistants} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assistant">Ayudantes (Opcional)</Label>
              <MultiSelectFirefighter title="Ayudantes" selected={assistants} onSelectedChange={setAssistants} firefighters={instructorsAndAssistants} />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Seleccione los aspirantes que participarán en la clase.</p>
            <div className="space-y-2">
                <Label>Asistentes (Aspirantes)</Label>
                <MultiSelectFirefighter title="aspirantes" selected={attendees} onSelectedChange={setAttendees} firefighters={aspirantes} />
              </div>
          </div>
        );
       case 4:
            return (
                <div className="space-y-4 text-sm">
                    <h4 className="font-bold text-base">Por favor, revise y confirme los detalles de la clase:</h4>
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                       <p><strong>Título:</strong> {title}</p>
                       <p><strong>Especialidad:</strong> {specialization}</p>
                       <p><strong>Fecha y Hora:</strong> {date} a las {time}hs</p>
                       <p><strong>Instructores:</strong> {instructors.map(f => f.lastName).join(', ') || 'Ninguno'}</p>
                       <p><strong>Ayudantes:</strong> {assistants.map(f => f.lastName).join(', ') || 'Ninguno'}</p>
                       <div className="pt-2">
                           <p className="font-semibold">Total de Aspirantes Asignados: {attendees.length}</p>
                           {attendees.length > 0 && (
                               <div className="text-xs text-muted-foreground h-24 overflow-y-auto border bg-background rounded-md p-2 mt-1">
                                   {attendees.map(f => `${f.lastName}, ${f.firstName}`).join('; ')}
                               </div>
                           )}
                       </div>
                    </div>
                </div>
            );
      default:
        return null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
    }}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="w-[95vw] max-w-xl rounded-md flex flex-col max-h-[90vh]">
             <DialogHeader>
                <DialogTitle className="font-headline">Crear Nueva Clase para Aspirantes</DialogTitle>
                <DialogDescription>
                Paso {step} de {totalSteps} - Complete los detalles de la nueva clase.
                </DialogDescription>
                <Progress value={progress} className="mt-2" />
            </DialogHeader>

            <div className="flex-grow py-4 overflow-y-auto">
                {renderStepContent()}
            </div>
            
            <DialogFooter className="flex-shrink-0 pt-4 border-t">
                 <div className="flex justify-between w-full">
                     <Button variant="outline" onClick={handleBack} disabled={step === 1 || loading}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Anterior
                    </Button>
                     {step < totalSteps ? (
                        <Button onClick={handleNext} disabled={loading}>
                            Siguiente
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Clase'}
                        </Button>
                    )}
                 </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
