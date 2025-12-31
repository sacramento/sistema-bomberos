
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Firefighter, Week, Task } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, UserCheck, Calendar as CalendarIcon } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { updateTask } from "@/services/tasks.service";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const MultiFirefighterSelect = ({ 
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
    
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-10">
                    <div className="flex gap-1 flex-wrap">
                        {selected.length > 0 ? selected.map(f => <Badge variant="secondary" key={f.id}>{f.lastName}</Badge>) : `Seleccionar ${title.toLowerCase()}...`}
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
                                <CommandItem key={firefighter.id} value={`${firefighter.legajo} ${firefighter.firstName} ${firefighter.lastName}`}
                                    onSelect={() => handleSelect(firefighter)}>
                                    <Check className={cn("mr-2 h-4 w-4", selected.some(s => s.id === firefighter.id) ? "opacity-100" : "opacity-0")} />
                                    {`${firefighter.lastName}, ${firefighter.firstName}`}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


export default function EditTaskDialog({ children, week, task, onTaskUpdated }: { children: React.ReactNode; week: Week, task: Task, onTaskUpdated: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assignedTo, setAssignedTo] = useState<Firefighter[]>(task.assignedTo || []);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    if (open) {
        setTitle(task.title);
        setDescription(task.description);
        setAssignedTo(task.assignedTo || []);
        setDateRange(
            (task.startDate || task.endDate) 
            ? { from: task.startDate ? parseISO(task.startDate) : undefined, to: task.endDate ? parseISO(task.endDate) : undefined }
            : undefined
        );
    }
  }, [open, task]);
  

  const assignToAll = () => {
    if (week.allMembers) {
        setAssignedTo(week.allMembers.filter(m => m.status === 'Active' || m.status === 'Auxiliar'));
    }
  }

  const handleSubmit = async () => {
    setLoading(true);
    if (!title || assignedTo.length === 0) {
        toast({ title: "Error", description: "El título y al menos un asignado son requeridos.", variant: "destructive" });
        setLoading(false);
        return;
    }
    
    try {
        const taskData = {
            title,
            description,
            assignedToIds: assignedTo.map(f => f.id),
            startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
            endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        };
        
        await updateTask(task.id, taskData);
        
        onTaskUpdated();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({ title: "Error", description: error.message || "No se pudo actualizar la tarea.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-lg">
             <DialogHeader>
                <DialogTitle className="font-headline">Editar Tarea</DialogTitle>
                <DialogDescription>Modifique los detalles de la tarea y sus asignados.</DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="title-edit">Título de la Tarea</Label>
                    <Input id="title-edit" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description-edit">Descripción (Opcional)</Label>
                    <Textarea id="description-edit" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label>Período de Ejecución (Opcional)</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date-edit"
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Toda la semana</span>
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
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label>Asignar a</Label>
                        <Button variant="link" size="sm" className="p-0 h-auto" onClick={assignToAll}>
                            <UserCheck className="mr-2 h-4 w-4"/>
                            Asignar a todos
                        </Button>
                    </div>
                    <MultiFirefighterSelect title="integrantes" selected={assignedTo} onSelectedChange={setAssignedTo} firefighters={week.allMembers?.filter(m => m.status === 'Active' || m.status === 'Auxiliar') || []} />
                </div>
            </div>
            
            <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
