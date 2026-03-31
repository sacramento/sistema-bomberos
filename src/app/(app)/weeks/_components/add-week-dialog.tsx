
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
import { addWeek } from "@/services/weeks.service";
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

export default function AddWeekDialog({ 
    children, 
    onWeekAdded, 
    initialData,
    loggedInFirefighter 
}: { 
    children: React.ReactNode; 
    onWeekAdded: () => void; 
    initialData?: Partial<Week>;
    loggedInFirefighter: Firefighter | null;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user: actor, getActiveRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  
  // Form state
  const [name, setName] = useState('');
  const [firehouse, setFirehouse] = useState<Week['firehouse'] | ''>('');
  const [lead, setLead] = useState<Firefighter | null>(null);
  const [driver, setDriver] = useState<Firefighter | null>(null);
  const [members, setMembers] = useState<Firefighter[]>([]);
  const [observations, setObservations] = useState('');
  
  const progress = (step / totalSteps) * 100;
  const activeRole = getActiveRole('/weeks');
  const isMaster = activeRole === 'Master';
  
  const activeFirefighters = useMemo(() => 
    allFirefighters.filter(f => f.status === 'Active' || f.status === 'Auxiliar'), 
  [allFirefighters]);

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
      if (open) {
          if (initialData) {
              setName(''); // Clear name even if cloning
              setFirehouse(initialData.firehouse || '');
              setLead(initialData.lead || null);
              setDriver(initialData.driver || null);
              setMembers(initialData.members || []);
              setObservations(initialData.observations || '');
          } else {
              // Auto-set firehouse for non-Master users
              if (!isMaster && loggedInFirefighter) {
                  setFirehouse(loggedInFirefighter.firehouse as any);
              }
          }
      }
  }, [open, initialData, isMaster, loggedInFirefighter])
  
  const resetForm = useCallback(() => {
    setName('');
    setFirehouse(!isMaster && loggedInFirefighter ? (loggedInFirefighter.firehouse as any) : '');
    setLead(null);
    setDriver(null);
    setMembers([]);
    setObservations('');
    setStep(1);
  }, [isMaster, loggedInFirefighter]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetForm();
  };

  const handleNext = () => {
    if (step === 1 && (!name || !firehouse)) {
      toast({ title: "Campos incompletos", description: "Faltan datos básicos.", variant: "destructive" });
      return;
    }
    if (step === 2 && (!lead || !driver)) {
      toast({ title: "Roles incompletos", description: "Seleccione encargado y chofer.", variant: "destructive" });
      return;
    }
    setStep(s => Math.min(s + 1, totalSteps));
  };
  const handleBack = () => setStep(s => Math.max(s - 1, 1));


  const handleSubmit = async () => {
    setLoading(true);
    if (!name || !firehouse || !lead || !driver || !actor) {
        toast({ title: "Error", description: "Faltan datos requeridos o sesión expirada.", variant: "destructive" });
        setLoading(false);
        return;
    }
    
    try {
        const weekData: Omit<Week, 'id' | 'allMemberIds' | 'allMembers'> = {
            name,
            firehouse,
            leadId: lead.id,
            driverId: driver.id,
            memberIds: members.map(m => m.id),
            observations
        };
        
        await addWeek(weekData, actor);
        toast({ title: "¡Éxito!", description: "Semana creada." });
        onWeekAdded();
        setOpen(false);
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
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
              <Input id="name" placeholder="Ej: Semana 1" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
             <div className="space-y-2">
                <Label>Cuartel</Label>
                 <Select onValueChange={(value) => setFirehouse(value as Week['firehouse'])} value={firehouse} disabled={!isMaster} required>
                    <SelectTrigger><SelectValue placeholder="Seleccione un cuartel" /></SelectTrigger>
                    <SelectContent>
                        {stationOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                {!isMaster && <p className="text-[10px] text-muted-foreground italic">Como administrador local, solo puedes crear semanas para tu cuartel.</p>}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Encargado de Semana</Label>
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
                <h4 className="font-bold text-base">Revisar y Guardar</h4>
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                   <p><strong>Semana:</strong> {name}</p>
                   <p><strong>Cuartel:</strong> {firehouse}</p>
                   <p><strong>Encargado:</strong> {lead ? `${lead.legajo} - ${lead.lastName}, ${lead.firstName}` : 'N/A'}</p>
                   <p><strong>Chofer:</strong> {driver ? `${driver.legajo} - ${driver.lastName}, ${driver.firstName}` : 'N/A'}</p>
                   <div className="pt-2">
                       <p className="font-semibold">Integrantes: {allTeam.length}</p>
                       <div className="text-xs text-muted-foreground h-20 overflow-y-auto border bg-background rounded-md p-2 mt-1">
                           {allTeam.map(f => `${f.legajo} - ${f.lastName}, ${f.firstName}`).join('; ')}
                       </div>
                   </div>
                   <div className="space-y-2">
                      <Label htmlFor="observations">Pizarra de Novedades</Label>
                      <Textarea id="observations" value={observations} onChange={(e) => setObservations(e.target.value)} />
                    </div>
                </div>
            </div>
        );
      default:
        return null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
             <DialogHeader>
                <DialogTitle className="font-headline">{initialData ? 'Clonar Semana' : 'Crear Nueva Semana'}</DialogTitle>
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
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
                        </Button>
                    )}
                 </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
