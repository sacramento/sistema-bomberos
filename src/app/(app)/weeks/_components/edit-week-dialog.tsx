
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
import { useState, useEffect, useMemo, useCallback } from "react";
import { Firefighter, Week } from "@/lib/types";
import { getFirefighters } from "@/services/firefighters.service";
import { updateWeek } from "@/services/weeks.service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { SingleFirefighterSelect, MultiFirefighterSelect } from "@/components/firefighter-select";

const stationOptions = [
    { value: 'Cuartel 1', label: 'Cuartel 1' },
    { value: 'Cuartel 2', label: 'Cuartel 2' },
    { value: 'Cuartel 3', label: 'Cuartel 3' },
];

export default function EditWeekDialog({ children, week, onWeekUpdated }: { children: React.ReactNode; week: Week; onWeekUpdated: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user: actor } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  
  // Form state
  const [name, setName] = useState(week.name);
  const [firehouse, setFirehouse] = useState(week.firehouse);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: parseISO(week.periodStartDate), to: parseISO(week.periodEndDate) });
  const [lead, setLead] = useState<Firefighter | null>(week.lead || null);
  const [driver, setDriver] = useState<Firefighter | null>(week.driver || null);
  const [members, setMembers] = useState<Firefighter[]>(week.members || []);
  const [observations, setObservations] = useState(week.observations || '');
  
  const progress = (step / totalSteps) * 100;
  
  const activeFirefighters = useMemo(() => 
    allFirefighters.filter(f => f.status === 'Active' || f.status === 'Auxiliar'), 
  [allFirefighters]);

  useEffect(() => {
    if (open) {
      setName(week.name);
      setFirehouse(week.firehouse);
      setDateRange({ from: parseISO(week.periodStartDate), to: parseISO(week.periodEndDate) });
      setLead(week.lead || null);
      setDriver(week.driver || null);
      setMembers(week.members || []);
      setObservations(week.observations || '');
      setStep(1);
      
      getFirefighters().then(setAllFirefighters);
    }
  }, [open, week]);

  const handleNext = () => {
    if (step === 1 && (!name || !firehouse || !dateRange?.from)) {
      toast({ title: "Campos incompletos", description: "Por favor, complete los datos básicos.", variant: "destructive" });
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
    if (!name || !firehouse || !dateRange?.from || !dateRange?.to || !lead || !driver || !actor) {
        toast({ title: "Error", description: "Faltan datos para actualizar la semana.", variant: "destructive" });
        return;
    }
    
    setLoading(true);
    try {
        const weekData: Partial<Omit<Week, 'id' | 'allMembers' | 'allMemberIds'>> = {
            name,
            firehouse,
            periodStartDate: format(dateRange.from, 'yyyy-MM-dd'),
            periodEndDate: format(dateRange.to, 'yyyy-MM-dd'),
            leadId: lead.id,
            driverId: driver.id,
            memberIds: members.map(m => m.id),
            observations
        };
        
        await updateWeek(week.id, weekData, actor);
        toast({ title: "¡Éxito!", description: "La semana ha sido actualizada." });
        onWeekUpdated();
        setOpen(false);
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "No se pudo actualizar la semana.", variant: "destructive" });
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
              <Label htmlFor="name-edit">Nombre de la Semana</Label>
              <Input id="name-edit" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
             <div className="space-y-2">
                <Label>Cuartel</Label>
                 <Select onValueChange={(value) => setFirehouse(value as Week['firehouse'])} value={firehouse} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {stationOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Período</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button id="date-edit" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })}</>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Seleccionar rango</span>)}
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
              <Label>Encargado</Label>
              <SingleFirefighterSelect title="Encargado" selected={lead} onSelectedChange={setLead} firefighters={activeFirefighters} />
            </div>
            <div className="space-y-2">
              <Label>Chofer</Label>
              <SingleFirefighterSelect title="Chofer" selected={driver} onSelectedChange={setDriver} firefighters={activeFirefighters.filter(f => f.id !== lead?.id)} />
            </div>
             <div className="space-y-2">
              <Label>Integrantes</Label>
              <MultiFirefighterSelect title="integrantes" selected={members} onSelectedChange={setMembers} firefighters={activeFirefighters} disabledIds={[lead?.id || '', driver?.id || '']} />
            </div>
          </div>
        );
      case 3:
         const allTeam = [lead, driver, ...members].filter(Boolean) as Firefighter[];
        return (
            <div className="space-y-4 text-sm">
                <h4 className="font-bold text-base">Revisar Cambios</h4>
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                   <p><strong>Semana:</strong> {name}</p>
                   <p><strong>Cuartel:</strong> {firehouse}</p>
                   <p><strong>Período:</strong> {dateRange?.from && format(dateRange.from, "P", { locale: es })} - {dateRange?.to && format(dateRange.to, "P", { locale: es })}</p>
                   <p><strong>Encargado:</strong> {lead ? `${lead.legajo} - ${lead.lastName}` : 'N/A'}</p>
                   <p><strong>Chofer:</strong> {driver ? `${driver.legajo} - ${driver.lastName}` : 'N/A'}</p>
                   <div className="pt-2">
                       <p className="font-semibold">Integrantes: {allTeam.length}</p>
                       <div className="text-xs text-muted-foreground h-20 overflow-y-auto border bg-background rounded-md p-2 mt-1">
                           {allTeam.map(f => `${f.legajo} - ${f.lastName}, ${f.firstName}`).join('; ')}
                       </div>
                   </div>
                   <div className="space-y-2">
                      <Label htmlFor="observations-edit">Pizarra de Novedades</Label>
                      <Textarea id="observations-edit" value={observations} onChange={(e) => setObservations(e.target.value)} />
                    </div>
                </div>
            </div>
        );
      default:
        return null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
             <DialogHeader>
                <DialogTitle className="font-headline">Editar Semana</DialogTitle>
                <DialogDescription>Paso {step} de {totalSteps}</DialogDescription>
                <Progress value={progress} className="mt-2" />
            </DialogHeader>
            <div className="flex-grow py-4 overflow-y-auto">{renderStepContent()}</div>
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
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Guardar Cambios
                        </Button>
                    )}
                 </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
