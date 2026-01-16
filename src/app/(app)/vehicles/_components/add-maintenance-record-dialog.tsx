
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
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { MaintenanceItem, MaintenanceChecklistItem, Vehicle, Firefighter } from "@/lib/types";
import { addMaintenanceRecord } from "@/services/maintenance.service";
import { CalendarIcon, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getFirefighters } from "@/services/firefighters.service";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

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


export default function AddMaintenanceRecordDialog({ children, vehicle, onRecordAdded }: { children: React.ReactNode; vehicle: Vehicle; onRecordAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [mileage, setMileage] = useState<number>(0);
  const [nextServiceDate, setNextServiceDate] = useState<Date | undefined>();
  const [nextServiceMileage, setNextServiceMileage] = useState<number>(0);
  const [checklist, setChecklist] = useState<MaintenanceChecklistItem[]>([]);
  const [observations, setObservations] = useState('');
  const [assistants, setAssistants] = useState<Firefighter[]>([]);
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);

  const activeFirefighters = useMemo(() => allFirefighters.filter(f => f.status === 'Active' || f.status === 'Auxiliar'), [allFirefighters]);

  useEffect(() => {
    if (open) {
        // Initialize checklist from the vehicle's specific maintenance items
        const vehicleChecklist = vehicle.maintenanceItems?.map(item => ({
            name: item.name,
            checked: false
        })) || [];
        setChecklist(vehicleChecklist);
        
        // Pre-fill mileage from vehicle data
        setMileage(vehicle.kilometraje);

        // Fetch firefighters
        getFirefighters()
            .then(setAllFirefighters)
            .catch(() => toast({ title: "Error", description: "No se pudieron cargar los bomberos.", variant: "destructive" }));

    }
  }, [open, vehicle, toast]);
  
  const resetForm = () => {
    setDate(new Date());
    setMileage(0);
    setNextServiceDate(undefined);
    setNextServiceMileage(0);
    setChecklist([]);
    setObservations('');
    setAssistants([]);
  }

  const handleChecklistChange = (itemName: string, checked: boolean) => {
    setChecklist(prev => prev.map(item => item.name === itemName ? { ...item, checked } : item));
  };
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!date || mileage <= 0) {
        toast({ title: "Error", description: "La fecha y el kilometraje son campos obligatorios.", variant: "destructive" });
        return;
    }
    
    setLoading(true);
    try {
        const newRecord = {
            vehicleId: vehicle.id,
            date: format(date, 'yyyy-MM-dd'),
            mileage,
            nextServiceDate: nextServiceDate ? format(nextServiceDate, 'yyyy-MM-dd') : undefined,
            nextServiceMileage: nextServiceMileage > 0 ? nextServiceMileage : undefined,
            checklist,
            observations,
            assistantIds: assistants.map(a => a.id),
        };
        
        await addMaintenanceRecord(newRecord);
        toast({ title: "¡Éxito!", description: "El registro de mantenimiento ha sido guardado." });
        onRecordAdded();
        resetForm();
        setOpen(false);

    } catch (error: any) {
        toast({ title: "Error", description: error.message || "No se pudo guardar el registro.", variant: "destructive" });
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Registrar Servicio para Móvil {vehicle.numeroMovil}</DialogTitle>
          <DialogDescription>
            Complete los detalles del servicio realizado y el checklist correspondiente.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-2 py-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">Fecha del Servicio</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={es} /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mileage">Kilometraje Actual</Label>
                        <Input id="mileage" type="number" value={mileage || ''} onChange={e => setMileage(Number(e.target.value))} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nextServiceDate">Próximo Servicio (Fecha)</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !nextServiceDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {nextServiceDate ? format(nextServiceDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={nextServiceDate} onSelect={setNextServiceDate} initialFocus locale={es} /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nextServiceMileage">Próximo Servicio (KM)</Label>
                        <Input id="nextServiceMileage" type="number" value={nextServiceMileage || ''} onChange={e => setNextServiceMileage(Number(e.target.value))} />
                    </div>
                </div>

                <Separator />
                
                <div className="space-y-2">
                    <Label>Checklist de Tareas Realizadas</Label>
                    <ScrollArea className="h-64 w-full rounded-md border p-4">
                        {checklist.length > 0 ? (
                            <div className="space-y-4">
                                {checklist.map(item => (
                                    <div key={item.name} className="flex items-center space-x-3">
                                        <Checkbox 
                                            id={`check-${item.name}`}
                                            checked={item.checked}
                                            onCheckedChange={(checked) => handleChecklistChange(item.name, checked as boolean)}
                                        />
                                        <label
                                            htmlFor={`check-${item.name}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                        {item.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center">Este móvil no tiene ítems de checklist configurados. Vaya a la pestaña "Checklist" para agregarlos.</p>
                        )}
                    </ScrollArea>
                </div>
                <div className="space-y-2">
                    <Label>Ayudantes (Opcional)</Label>
                     <MultiFirefighterSelect
                        title="ayudantes"
                        selected={assistants}
                        onSelectedChange={setAssistants}
                        firefighters={activeFirefighters}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="observaciones">Observaciones Adicionales</Label>
                    <Textarea id="observaciones" value={observations} onChange={e => setObservations(e.target.value)} placeholder="Anotaciones sobre el servicio, repuestos, etc." />
                </div>
            </form>
        </div>
        <DialogFooter className="border-t pt-4">
            <Button onClick={(e) => {
              e.preventDefault();
              const form = e.currentTarget.closest('div.flex-col')?.querySelector('form');
              form?.requestSubmit();
            }} disabled={loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</> : 'Guardar Registro'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
