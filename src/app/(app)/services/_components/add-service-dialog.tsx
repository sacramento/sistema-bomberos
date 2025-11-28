
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
import { useState, useEffect } from "react";
import { Firefighter, Vehicle, Service, ServiceType, SummonMethod } from "@/lib/types";
import { getFirefighters } from "@/services/firefighters.service";
import { getVehicles } from "@/services/vehicles.service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, ArrowRight, ArrowLeft } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const serviceTypes: ServiceType[] = ['Incendio', 'Rescate', 'Accidente', 'HazMat', 'Forestal', 'Especial', 'Otros'];
const summonMethods: SummonMethod[] = ['Alarma', 'VHF', 'Teléfono', 'En el Cuartel'];

const MultiSelect = ({
  title,
  options,
  selected,
  onSelectedChange,
  displayKey = 'label',
  valueKey = 'value'
}: {
  title: string;
  options: any[];
  selected: any[];
  onSelectedChange: (selected: any[]) => void;
  displayKey?: string;
  valueKey?: string;
}) => {
    const [open, setOpen] = useState(false);
    
    const handleSelect = (option: any) => {
        const isSelected = selected.some(s => s[valueKey] === option[valueKey]);
        if (isSelected) {
            onSelectedChange(selected.filter(s => s[valueKey] !== option[valueKey]));
        } else {
            onSelectedChange([...selected, option]);
        }
    };
    
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-10">
                    <div className="flex gap-1 flex-wrap">
                        {selected.length > 0 ? selected.map(s => <Badge variant="secondary" key={s[valueKey]}>{s[displayKey]}</Badge>) : `Seleccionar ${title.toLowerCase()}...`}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Buscar ${title.toLowerCase()}...`} />
                    <CommandList>
                        <CommandEmpty>No se encontraron opciones.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem key={option[valueKey]} value={option[displayKey]} onSelect={() => handleSelect(option)}>
                                    <Check className={cn("mr-2 h-4 w-4", selected.some(s => s[valueKey] === option[valueKey]) ? "opacity-100" : "opacity-0")} />
                                    {option[displayKey]}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default function AddServiceDialog({ children, onServiceAdded }: { children: React.ReactNode; onServiceAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Data sources
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);

  // Form state
  const [serviceId, setServiceId] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType | ''>('');
  const [date, setDate] = useState('');
  const [address, setAddress] = useState('');
  const [selectedSummonMethods, setSelectedSummonMethods] = useState<SummonMethod[]>([]);
  const [command, setCommand] = useState<Firefighter | null>(null);
  const [serviceChief, setServiceChief] = useState<Firefighter | null>(null);
  const [onDuty, setOnDuty] = useState<Firefighter[]>([]);
  const [offDuty, setOffDuty] = useState<Firefighter[]>([]);
  const [interveningVehicles, setInterveningVehicles] = useState<any[]>([]); // Simplified for now
  const [collaboration, setCollaboration] = useState('');
  const [recognition, setRecognition] = useState('');
  const [observations, setObservations] = useState('');
  
  const progress = (step / totalSteps) * 100;

  useEffect(() => {
    const fetchData = async () => {
      if (open) {
        setLoading(true);
        try {
          const [firefightersData, vehiclesData] = await Promise.all([getFirefighters(), getVehicles()]);
          setAllFirefighters(firefightersData);
          setAllVehicles(vehiclesData);
        } catch (error) {
          toast({ title: "Error", description: "No se pudieron cargar los datos para el formulario.", variant: "destructive" });
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [open, toast]);

  const resetForm = () => {
    // Reset all state variables
    setServiceId(''); setServiceType(''); setDate(''); setAddress(''); setSelectedSummonMethods([]);
    setCommand(null); setServiceChief(null); setOnDuty([]); setOffDuty([]);
    setInterveningVehicles([]); setCollaboration(''); setRecognition(''); setObservations('');
    setStep(1);
  };
  
  const handleNext = () => setStep(s => Math.min(s + 1, totalSteps));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));
  
  const handleSubmit = async () => {
    toast({ title: "Función no implementada", description: "El guardado del servicio aún no está implementado." });
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="serviceId">Número de Servicio</Label>
                    <Input id="serviceId" placeholder="Ej: C1-24/001" value={serviceId} onChange={e => setServiceId(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="serviceType">Tipo de Servicio</Label>
                <Select value={serviceType} onValueChange={v => setServiceType(v as any)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                    <SelectContent>{serviceTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" placeholder="Calle y número, o referencia" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label>Método de Convocatoria</Label>
                 <MultiSelect
                    title="Métodos"
                    options={summonMethods.map(m => ({ label: m, value: m }))}
                    selected={selectedSummonMethods.map(m => ({ label: m, value: m }))}
                    onSelectedChange={methods => setSelectedSummonMethods(methods.map(m => m.value))}
                    displayKey="label"
                    valueKey="value"
                />
            </div>
          </div>
        );
       case 2:
        const firefighterOptions = allFirefighters.map(f => ({ label: `${f.lastName}, ${f.firstName}`, value: f.id }));
        return (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Comando</Label>
                    {/* Placeholder */}
                </div>
                <div className="space-y-2">
                    <Label>Jefe de Servicio</Label>
                     {/* Placeholder */}
                </div>
                <div className="space-y-2">
                    <Label>Dotación de Servicio (de Guardia)</Label>
                     {/* Placeholder */}
                </div>
                <div className="space-y-2">
                    <Label>Dotación de Pasiva (Fuera de Guardia)</Label>
                    {/* Placeholder */}
                </div>
            </div>
        )
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Móviles Intervinientes</Label>
              <p className="text-sm text-muted-foreground">Funcionalidad para agregar móviles próximamente.</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="collaboration">Colaboración</Label>
              <Textarea id="collaboration" placeholder="Policía, Ambulancia, etc." value={collaboration} onChange={e => setCollaboration(e.target.value)} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="recognition">Reconocimiento</Label>
              <Textarea id="recognition" placeholder="Menciones especiales al personal o acciones." value={recognition} onChange={e => setRecognition(e.target.value)} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="observations">Observaciones Generales</Label>
              <Textarea id="observations" placeholder="Cualquier otra nota relevante sobre el servicio." value={observations} onChange={e => setObservations(e.target.value)} />
            </div>
          </div>
        );
       case 4:
        return (
            <div className="space-y-4 text-sm">
                <h4 className="font-bold text-base">Revisar y Guardar</h4>
                <p className="text-muted-foreground">Revise la información antes de guardar el servicio.</p>
                {/* Summary will be implemented here */}
            </div>
        )
      default:
        return null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setOpen(isOpen); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Registrar Nuevo Servicio</DialogTitle>
           <DialogDescription>Paso {step} de {totalSteps} - Complete la información del servicio.</DialogDescription>
           <Progress value={progress} className="mt-2" />
        </DialogHeader>
        <div className="flex-grow py-4 overflow-y-auto pr-2">{renderStepContent()}</div>
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
                {loading ? 'Guardando...' : 'Finalizar y Guardar'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
