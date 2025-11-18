
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
import { Course, Session } from "@/lib/types";
import { updateCourse } from "@/services/courses.service";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

const specializations: Session['specialization'][] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'VARIOS'];

export default function EditCourseDialog({ children, course, onCourseUpdated }: { children: React.ReactNode; course: Course; onCourseUpdated: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [specialization, setSpecialization] = useState<Session['specialization']>(course.specialization);
  const [title, setTitle] = useState(course.title);
  const [location, setLocation] = useState(course.location);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: parseISO(course.startDate),
      to: parseISO(course.endDate),
  });

  useEffect(() => {
    if (open) {
      setSpecialization(course.specialization);
      setTitle(course.title);
      setLocation(course.location);
      setDateRange({
        from: parseISO(course.startDate),
        to: parseISO(course.endDate),
      });
    }
  }, [open, course]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!specialization || !title || !location || !dateRange?.from || !dateRange?.to) {
        toast({
            title: "Error",
            description: "Por favor, complete todos los campos.",
            variant: "destructive",
        });
        return;
    }
    
    setLoading(true);

    try {
        const updatedCourseData: Partial<Omit<Course, 'id' | 'firefighterId' | 'firefighterName' | 'firefighterLegajo'>> = {
            specialization,
            title,
            location,
            startDate: format(dateRange.from, 'yyyy-MM-dd'),
            endDate: format(dateRange.to, 'yyyy-MM-dd'),
        };
        
        await updateCourse(course.id, updatedCourseData);

        toast({
            title: "¡Éxito!",
            description: "El curso ha sido actualizado.",
        });
        
        onCourseUpdated();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error",
            description: error.message || "No se pudo actualizar el curso.",
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
            <DialogTitle className="font-headline">Editar Registro de Curso</DialogTitle>
            <DialogDescription>
              Modifique los detalles del curso.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Bombero</Label>
              <Input value={`${course.firefighterLegajo} - ${course.firefighterName}`} disabled />
            </div>
             <div className="space-y-2">
              <Label htmlFor="title-edit">Título del Curso</Label>
              <Input id="title-edit" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialization-edit">Especialidad</Label>
              <Select onValueChange={(value) => setSpecialization(value as Session['specialization'])} value={specialization} required>
                <SelectTrigger id="specialization-edit">
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
              <Label htmlFor="location-edit">Lugar</Label>
              <Input id="location-edit" value={location} onChange={(e) => setLocation(e.target.value)} required />
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
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
