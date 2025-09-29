
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
import { useState } from "react";
import { Firefighter, Week } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Calendar as CalendarIcon, UserCheck } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { addTask } from "@/services/tasks.service";

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


export default function AddTaskDialog({ children, week, onTaskAdded }: { children: React.ReactNode; week: Week, onTaskAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [assignedTo, setAssignedTo] = useState<Firefighter[]>([]);
  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate(undefined);
    setAssignedTo([]);
  };

  const assignToAll = () => {
    if (week.allMembers) {
        setAssignedTo(week.allMembers);
    }
  }


  const handleSubmit = async () => {
    setLoading(true);
    if (!title || !dueDate || assignedTo.length === 0) {
        toast({ title: "Error", description: "Título, fecha de vencimiento y al menos un asignado son requeridos.", variant: "destructive" });
        setLoading(false);
        return;
    }
    
    try {
        const taskData = {
            weekId: week.id,
            title,
            description,
            dueDate: format(dueDate, 'yyyy-MM-dd'),
            assignedToIds: assignedTo.map(f => f.id),
            status: 'Pendiente' as const
        };
        
        await addTask(taskData);

        toast({ title: "¡Éxito!", description: "La nueva tarea ha sido creada y asignada." });
        
        onTaskAdded();
        resetForm();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({ title: "Error", description: error.message || "No se pudo crear la tarea.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setOpen(isOpen); }}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-lg">
             <DialogHeader>
                <DialogTitle className="font-headline">Nueva Tarea para {week.name}</DialogTitle>
                <DialogDescription>Complete los detalles de la tarea y asígnela a los integrantes correspondientes.</DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="title">Título de la Tarea</Label>
                    <Input id="title" placeholder="Ej: Limpieza de unidad móvil 5" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">Descripción (Opcional)</Label>
                    <Textarea id="description" placeholder="Detalles adicionales sobre la tarea..." value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Fecha de Vencimiento</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="dueDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dueDate ? format(dueDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label>Asignar a</Label>
                        <Button variant="link" size="sm" className="p-0 h-auto" onClick={assignToAll}>
                            <UserCheck className="mr-2 h-4 w-4"/>
                            Asignar a todos
                        </Button>
                    </div>
                    <MultiFirefighterSelect title="integrantes" selected={assignedTo} onSelectedChange={setAssignedTo} firefighters={week.allMembers || []} />
                </div>
            </div>
            
            <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Tarea'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
