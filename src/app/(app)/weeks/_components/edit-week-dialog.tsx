
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
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
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
  const { user: actor, getActiveRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  
  // Form state
  const [name, setName] = useState(week.name);
  const [firehouse, setFirehouse] = useState(week.firehouse);
  const [lead, setLead] = useState<Firefighter | null>(week.lead || null);
  const [driver, setDriver] = useState<Firefighter | null>(week.driver || null);
  const [members, setMembers] = useState<Firefighter[]>(week.members || []);
  const [observations, setObservations] = useState(week.observations || '');
  
  const progress = (step / totalSteps) * 100;
  const activeRole = getActiveRole('/weeks');
  const isMaster = activeRole === 'Master';
  
  const activeFirefighters = useMemo(() => 
    allFirefighters.filter(f => f.status === 'Active' || f.status === 'Auxiliar'), 
  [allFirefighters]);

  useEffect(() => {
    if (open) {
      setName(week.name);
      setFirehouse(week.firehouse);
      setLead(week.lead || null);
      setDriver(week.driver || null);
      setMembers(week.members || []);
      setObservations(week.observations || '');
      setStep(1);
      
      getFirefighters().then(setAllFirefighters);
    }
  }, [open, week]);

  const handleNext = () => {
    if (step === 1 && (!name || !firehouse)) {
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
    if (!name || !firehouse || !lead || !driver || !actor) {
        toast({ title: "Error", description: "Faltan datos para actualizar la semana.", variant: "destructive" });
        return;
    }
    
    setLoading(true);
    try {
        const weekData: Partial<Omit<Week, 'id' | 'allMembers' | 'allMemberIds'>> = {
            name,
            firehouse: firehouse as any,
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
                 <Select onValueChange={(value) => setFirehouse(value as Week['firehouse'])} value={firehouse} disabled={!isMaster} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {stationOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                </Select>
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
