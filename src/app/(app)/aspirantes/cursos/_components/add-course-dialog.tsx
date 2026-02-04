
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
import { useState, useEffect, useMemo } from "react";
import { Firefighter, Course, Session } from "@/lib/types";
import { getFirefighters } from "@/services/firefighters.service";
import { batchAddCourses } from "@/services/courses.service";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Calendar as CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
                        <CommandEmpty>No se encontraron aspirantes.</CommandEmpty>
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

export default function AddAspiranteCourseDialog({ children, onCourseAdded }: { children: React.ReactNode; onCourseAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  const [selectedFirefighters, setSelectedFirefighters] = useState<Firefighter[]>([]);
  const [specialization, setSpecialization] = useState<Session['specialization'] | ''>('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const aspirantes = useMemo(() => allFirefighters.filter(f => f.rank === 'ASPIRANTE' && (f.status === 'Active' || f.status === 'Auxiliar')), [allFirefighters]);

  useEffect(() => {
    const fetchAllFirefighters = async () => {
        if (open) {
            try {
                const data = await getFirefighters();
                setAllFirefighters(data);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los aspirantes.",
                    variant: "destructive"
                });
            }
        }
    };
    fetchAllFirefighters();
  }, [open, toast]);

  const resetForm = () => {
    setSelectedFirefighters([]);
    setSpecialization('');
    setTitle('');
    setLocation('');
    setDateRange(undefined);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedFirefighters.length === 0 || !specialization || !title || !location || !dateRange?.from || !dateRange?.to) {
        toast({
            title: "Error",
            description: "Por favor, complete todos los campos, incluyendo al menos un aspirante.",
            variant: "destructive",
        });
        return;
    }
    
    setLoading(true);

    try {
        const coursesToCreate: Omit<Course, 'id'>[] = selectedFirefighters.map(firefighter => ({
            firefighterId: firefighter.id,
            firefighterName: `${firefighter.firstName} ${firefighter.lastName}`,
            firefighterLegajo: firefighter.legajo,
            specialization: specialization as Session['specialization'],
            title,
            location,
            startDate: format(dateRange.from!, 'yyyy-MM-dd'),
            endDate: format(dateRange.to!, 'yyyy-MM-dd'),
        }));
        
        await batchAddCourses(coursesToCreate);

        toast({
            title: "¡Éxito!",
            description: `${coursesToCreate.length} registros de curso han sido creados correctamente.`,
        });
        
        onCourseAdded();
        resetForm();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error",
            description: error.message || "No se pudo registrar el curso.",
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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Registrar Curso para Aspirantes</DialogTitle>
            <DialogDescription>
              Complete los detalles del curso y seleccione uno o más aspirantes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firefighter">Aspirantes</Label>
               <MultiSelectFirefighter
                    title="aspirantes"
                    selected={selectedFirefighters}
                    onSelectedChange={setSelectedFirefighters}
                    firefighters={aspirantes}
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Título del Curso</Label>
              <Input id="title" placeholder="Ej: Conductor de Vehículos de Emergencia" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
             <div className="space-y-2">
              <Label htmlFor="specialization">Especialidad</Label>
              <Select onValueChange={(value) => setSpecialization(value as Session['specialization'])} value={specialization} required>
                <SelectTrigger id="specialization">
                  <SelectValue placeholder="Seleccione una especialidad" />
                </SelectTrigger>
                <SelectContent>
                  {specializations.map(spec => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label htmlFor="location">Lugar</Label>
              <Input id="location" placeholder="Ej: Academia Nacional de Bomberos" value={location} onChange={(e) => setLocation(e.target.value)} required />
            </div>
             <div className="space-y-2">
                <Label>Rango de Fechas</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                    {format(dateRange.from, "LLL dd, y", { locale: es })} -{' '}
                                    {format(dateRange.to, "LLL dd, y", { locale: es })}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y", { locale: es })
                                )
                            ) : (
                                <span>Seleccionar rango de fechas</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                            locale={es}
                        />
                    </PopoverContent>
                </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Curso(s)'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
