
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
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Firefighter, Week } from "@/lib/types";
import { getFirefighters } from "@/services/firefighters.service";
import { addWeek } from "@/services/weeks.service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Calendar as CalendarIcon, ArrowRight, ArrowLeft } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

const stationOptions = [
    { value: 'Cuartel 1', label: 'Cuartel 1' },
    { value: 'Cuartel 2', label: 'Cuartel 2' },
    { value: 'Cuartel 3', label: 'Cuartel 3' },
];

// Reusable component for selecting a single firefighter
const SingleFirefighterSelect = ({
    title,
    selected,
    onSelectedChange,
    firefighters
}: {
    title: string;
    selected: Firefighter | null;
    onSelectedChange: (firefighter: Firefighter | null) => void;
    firefighters: Firefighter[];
}) => {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                    {selected ? `${selected.legajo} - ${selected.firstName} ${selected.lastName}` : `Seleccionar ${title.toLowerCase()}...`}
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
                                    onSelect={() => { onSelectedChange(firefighter); setOpen(false); }}>
                                    <Check className={cn("mr-2 h-4 w-4", selected?.id === firefighter.id ? "opacity-100" : "opacity-0")} />
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

// Reusable component for selecting multiple firefighters
const MultiFirefighterSelect = ({ 
    title, 
    selected, 
    onSelectedChange,
    firefighters,
    disabledIds = []
}: { 
    title: string;
    selected: Firefighter[]; 
    onSelectedChange: (selected: Firefighter[]) => void;
    firefighters: Firefighter[];
    disabledIds?: string[];
}) => {
    const [open, setOpen] = useState(false);
    const handleSelect = (firefighter: Firefighter) => {
        if (disabledIds.includes(firefighter.id)) return;
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
                                    onSelect={() => handleSelect(firefighter)}
                                    disabled={disabledIds.includes(firefighter.id)}>
                                    <Check className={cn("mr-2 h-4 w-4", selected.some(s => s.id === firefighter.id) ? "opacity-100" : "opacity-0")} />
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

export default function AddWeekDialog({ children, onWeekAdded, initialData }: { children: React.ReactNode; onWeekAdded: () => void; initialData?: Partial<Week> }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  
  // Form state
  const [name, setName] = useState('');
  const [firehouse, setFirehouse] = useState<Week['firehouse'] | ''>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [lead, setLead] = useState<Firefighter | null>(null);
  const [driver, setDriver] = useState<Firefighter | null>(null);
  const [members, setMembers] = useState<Firefighter[]>([]);
  const [observations, setObservations] = useState('');
  
  const progress = (step / totalSteps) * 100;

  useEffect(() => {
    const fetchAllFirefighters = async () => {
        if (open) {
            try {
                const data = await getFirefighters();
                setAllFirefighters(data);
            } catch (error) {
                toast({ title: "Error", description: "No se pudieron cargar los bomberos.", variant: "destructive" });
            }
        }
    };
    fetchAllFirefighters();
  }, [open, toast]);

  useEffect(() => {
      if (open && initialData) {
          setFirehouse(initialData.firehouse || '');
          setLead(initialData.lead || null);
          setDriver(initialData.driver || null);
          setMembers(initialData.members || []);
      }
  }, [open, initialData])
  
  
  const resetForm = () => {
    setName('');
    setFirehouse('');
    setDateRange(undefined);
    setLead(null);
    setDriver(null);
    setMembers([]);
    setObservations('');
    setStep(1);
  };

  const handleNext = () => {
    if (step === 1 && (!name || !firehouse || !dateRange?.from)) {
      toast({ title: "Campos incompletos", description: "Por favor, complete nombre, cuartel y fecha de inicio.", variant: "destructive" });
      return;
    }
    if (step === 2 && (!lead || !driver)) {
      toast({ title: "Roles incompletos", description: "Debe seleccionar un encargado y un chofer.", variant: "destructive" });
      return;
    }
    setStep(s => Math.min(s + 1, totalSteps));
  };
  const handleBack = () => setStep(s => Math.max(s - 1, 1));


  const handleSubmit = async () => {
    setLoading(true);
    // Final validation before submit
    if (!name || !firehouse || !dateRange?.from || !dateRange?.to || !lead || !driver) {
        toast({ title: "Error", description: "Faltan datos para crear la semana.", variant: "destructive" });
        setLoading(false);
        return;
    }
    
    try {
        const weekData: Omit<Week, 'id' | 'allMemberIds' | 'allMembers'> = {
            name,
            firehouse,
            periodStartDate: format(dateRange.from, 'yyyy-MM-dd'),
            periodEndDate: format(dateRange.to, 'yyyy-MM-dd'),
            leadId: lead.id,
            driverId: driver.id,
            memberIds: members.map(m => m.id),
            observations
        };
        
        await addWeek(weekData);

        toast({ title: "¡Éxito!", description: "La nueva semana ha sido creada." });
        
        onWeekAdded();
        resetForm();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({ title: "Error", description: error.message || "No se pudo crear la semana.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }
  
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Semana</Label>
              <Input id="name" placeholder="Ej: Semana 1, Guardia Roja" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
             <div className="space-y-2">
                <Label>Cuartel</Label>
                 <Select onValueChange={(value) => setFirehouse(value as Week['firehouse'])} value={firehouse} required>
                    <SelectTrigger><SelectValue placeholder="Seleccione un cuartel" /></SelectTrigger>
                    <SelectContent>
                        {stationOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Período de la Semana</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })}</>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Seleccionar rango de fechas</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={1} locale={es} />
                    </PopoverContent>
                </Popover>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Encargado de Semana</Label>
              <SingleFirefighterSelect title="Encargado" selected={lead} onSelectedChange={setLead} firefighters={allFirefighters} />
            </div>
            <div className="space-y-2">
              <Label>Chofer</Label>
              <SingleFirefighterSelect title="Chofer" selected={driver} onSelectedChange={setDriver} firefighters={allFirefighters.filter(f => f.id !== lead?.id)} />
            </div>
             <div className="space-y-2">
              <Label>Integrantes</Label>
              <MultiFirefighterSelect title="integrantes" selected={members} onSelectedChange={setMembers} firefighters={allFirefighters} disabledIds={[lead?.id || '', driver?.id || '']} />
              <p className="text-xs text-muted-foreground">El encargado y el chofer ya están incluidos. Agregue aquí al resto del personal.</p>
            </div>
          </div>
        );
      case 3:
         const allTeam = [lead, driver, ...members].filter(Boolean) as Firefighter[];
        return (
            <div className="space-y-4 text-sm">
                <h4 className="font-bold text-base">Revisar y Guardar</h4>
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                   <p><strong>Semana:</strong> {name}</p>
                   <p><strong>Cuartel:</strong> {firehouse}</p>
                   <p><strong>Período:</strong> {dateRange?.from && format(dateRange.from, "P", { locale: es })} - {dateRange?.to && format(dateRange.to, "P", { locale: es })}</p>
                   <p><strong>Encargado:</strong> {lead?.lastName || 'No asignado'}</p>
                   <p><strong>Chofer:</strong> {driver?.lastName || 'No asignado'}</p>
                   <div className="pt-2">
                       <p className="font-semibold">Total de Integrantes: {allTeam.length}</p>
                       {allTeam.length > 0 && (
                           <div className="text-xs text-muted-foreground h-20 overflow-y-auto border bg-background rounded-md p-2 mt-1">
                               {allTeam.map(f => f.lastName).join(', ')}
                           </div>
                       )}
                   </div>
                   <div className="space-y-2">
                      <Label htmlFor="observations">Pizarra de Novedades (Observaciones)</Label>
                      <Textarea id="observations" placeholder="Deje notas o novedades para la semana..." value={observations} onChange={(e) => setObservations(e.target.value)} />
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
        if (isOpen) {
            // If we are opening and NOT cloning, reset.
            if (!initialData) {
                resetForm();
            }
        } else {
            // Always reset on close.
            resetForm();
        }
        setOpen(isOpen); 
    }}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-lg flex flex-col">
             <DialogHeader>
                <DialogTitle className="font-headline">{initialData ? 'Clonar Semana' : 'Crear Nueva Semana'}</DialogTitle>
                <DialogDescription>
                  {initialData ? 'Ajuste los detalles para la nueva semana clonada.' : `Paso ${step} de ${totalSteps} - Complete los detalles de la nueva semana.`}
                </DialogDescription>
                <Progress value={progress} className="mt-2" />
            </DialogHeader>

            <div className="flex-grow py-4 overflow-y-auto">
                {renderStepContent()}
            </div>
            
            <DialogFooter className="flex-shrink-0 pt-4 border-t">
                 <div className="flex justify-between w-full">
                     <Button variant="outline" onClick={handleBack} disabled={step === 1 || loading}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
                    </Button>
                     {step < totalSteps ? (
                        <Button onClick={handleNext} disabled={loading}>
                            Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Semana'}
                        </Button>
                    )}
                 </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}

    