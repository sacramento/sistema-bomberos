
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
import { Firefighter, Vehicle, Service, ServiceType, SummonMethod, InterveningVehicle } from "@/lib/types";
import { getFirefighters } from "@/services/firefighters.service";
import { getVehicles } from "@/services/vehicles.service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, ArrowRight, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";

const serviceTypes: ServiceType[] = ['Incendio', 'Rescate', 'Accidente', 'HazMat', 'Forestal', 'Especial', 'Otros'];
const summonMethods: SummonMethod[] = ['Alarma', 'VHF', 'Teléfono', 'En el Cuartel'];
const cuarteles: Service['cuartel'][] = ['C1', 'C2', 'C3'];

const SingleFirefighterSelect = ({
    title,
    selected,
    onSelectedChange,
    firefighters,
    disabledIds = []
}: {
    title: string;
    selected: Firefighter | null;
    onSelectedChange: (firefighter: Firefighter | null) => void;
    firefighters: Firefighter[];
    disabledIds?: string[];
}) => {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                    {selected ? `${selected.lastName}, ${selected.firstName}` : `Seleccionar ${title.toLowerCase()}...`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Buscar por legajo o nombre...`} />
                    <CommandList>
                        <CommandEmpty>No se encontraron bomberos.</CommandEmpty>
                        <CommandGroup>
                            {firefighters.map((firefighter) => (
                                <CommandItem key={firefighter.id} value={`${firefighter.legajo} ${firefighter.lastName} ${firefighter.firstName}`}
                                    onSelect={() => { onSelectedChange(firefighter); setOpen(false); }}
                                    disabled={disabledIds.includes(firefighter.id)}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", selected?.id === firefighter.id ? "opacity-100" : "opacity-0")} />
                                    {`${firefighter.legajo} - ${firefighter.lastName}, ${firefighter.firstName}`}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const MultiSelect = ({
  title,
  options,
  selected,
  onSelectedChange,
  displayKey = 'label',
  valueKey = 'value',
  disabledIds = []
}: {
  title: string;
  options: any[];
  selected: any[];
  onSelectedChange: (selected: any[]) => void;
  displayKey?: string;
  valueKey?: string;
  disabledIds?: string[];
}) => {
    const [open, setOpen] = useState(false);
    
    const handleSelect = (option: any) => {
        if(disabledIds.includes(option[valueKey])) return;
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
                        {selected.length > 0 ? selected.map(s => <Badge variant="secondary" key={s[valueKey]}>{s.legajo ? `${s.legajo} - ${s[displayKey]}` : s[displayKey]}</Badge>) : `Seleccionar ${title.toLowerCase()}...`}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Buscar por legajo o nombre...`} />
                    <CommandList>
                        <CommandEmpty>No se encontraron opciones.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem key={option[valueKey]} value={`${option.legajo} ${option[displayKey]}`} onSelect={() => handleSelect(option)} disabled={disabledIds.includes(option[valueKey])}>
                                    <Check className={cn("mr-2 h-4 w-4", selected.some(s => s[valueKey] === option[valueKey]) ? "opacity-100" : "opacity-0")} />
                                    {option.legajo ? `${option.legajo} - ${option[displayKey]}` : option[displayKey]}
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
  const [cuartel, setCuartel] = useState<Service['cuartel'] | ''>('');
  const [manualId, setManualId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType | ''>('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [address, setAddress] = useState('');
  const [selectedSummonMethods, setSelectedSummonMethods] = useState<SummonMethod[]>([]);
  const [command, setCommand] = useState<Firefighter | null>(null);
  const [serviceChief, setServiceChief] = useState<Firefighter | null>(null);
  const [onDuty, setOnDuty] = useState<Firefighter[]>([]);
  const [offDuty, setOffDuty] = useState<Firefighter[]>([]);
  const [interveningVehicles, setInterveningVehicles] = useState<Partial<InterveningVehicle & { vehicle?: Vehicle }>[]>([]);
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

  useEffect(() => {
    if (cuartel && manualId && date) {
      const year = new Date(date).getFullYear().toString().slice(-2);
      const formattedManualId = manualId.padStart(3, '0');
      setServiceId(`${cuartel}-${year}/${formattedManualId}`);
    } else {
      setServiceId('');
    }
  }, [cuartel, manualId, date]);

  const resetForm = () => {
    setCuartel(''); setManualId(''); setServiceId('');
    setServiceType(''); setDate(''); setStartTime(''); setEndTime(''); setAddress(''); setSelectedSummonMethods([]);
    setCommand(null); setServiceChief(null); setOnDuty([]); setOffDuty([]);
    setInterveningVehicles([]); setCollaboration(''); setRecognition(''); setObservations('');
    setStep(1);
  };
  
  const handleNext = () => setStep(s => Math.min(s + 1, totalSteps));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));
  
  const handleSubmit = async () => {
    toast({ title: "Función no implementada", description: "El guardado del servicio aún no está implementado." });
  };
  
  const handleAddVehicle = () => {
    setInterveningVehicles(prev => [...prev, { vehicleId: '', departureTime: '', returnTime: '', inChargeId: '' }]);
  }
  
  const handleVehicleChange = (index: number, field: keyof InterveningVehicle, value: string) => {
    setInterveningVehicles(prev => {
        const newVehicles = [...prev];
        const vehicle = allVehicles.find(v => v.id === newVehicles[index].vehicleId);
        newVehicles[index] = { ...newVehicles[index], [field]: value, vehicle };
        return newVehicles;
    });
  };

  const handleRemoveVehicle = (index: number) => {
    setInterveningVehicles(prev => prev.filter((_, i) => i !== index));
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="cuartel">Cuartel</Label>
                    <Select value={cuartel} onValueChange={(v) => setCuartel(v as any)}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                        <SelectContent>{cuarteles.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="startTime">Hora Comienzo</Label>
                    <Input id="startTime" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="endTime">Hora Finalización</Label>
                    <Input id="endTime" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="manualId">Número de Planilla</Label>
                    <Input id="manualId" placeholder="Ej: 1, 25, 134" value={manualId} onChange={e => setManualId(e.target.value)} />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                    <Label>ID de Servicio (Generado)</Label>
                    <Input id="serviceId" value={serviceId} readOnly disabled />
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
        const firefighterOptions = allFirefighters.map(f => ({ label: `${f.lastName}, ${f.firstName}`, value: f.id, legajo: f.legajo }));
        const disabledPersonnelIds = [command?.id, serviceChief?.id, ...onDuty.map(f => f.id)].filter(Boolean) as string[];
        return (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Comando</Label>
                    <SingleFirefighterSelect title="Comando" selected={command} onSelectedChange={setCommand} firefighters={allFirefighters} />
                </div>
                <div className="space-y-2">
                    <Label>Jefe de Servicio</Label>
                    <SingleFirefighterSelect title="Jefe de Servicio" selected={serviceChief} onSelectedChange={setServiceChief} firefighters={allFirefighters} disabledIds={[command?.id].filter(Boolean) as string[]}/>
                </div>
                <div className="space-y-2">
                    <Label>Dotación de Servicio</Label>
                    <MultiSelect title="Integrantes" options={firefighterOptions} selected={onDuty} onSelectedChange={setOnDuty} displayKey="label" valueKey="value" disabledIds={[command?.id, serviceChief?.id].filter(Boolean) as string[]}/>
                </div>
                <div className="space-y-2">
                    <Label>Dotación de Pasiva</Label>
                    <MultiSelect title="Integrantes" options={firefighterOptions} selected={offDuty} onSelectedChange={setOffDuty} displayKey="label" valueKey="value" disabledIds={disabledPersonnelIds}/>
                </div>
            </div>
        )
      case 3:
        return (
          <div className="space-y-4">
             <div className="space-y-2">
                <Label>Móviles Intervinientes</Label>
                 {interveningVehicles.map((iv, index) => (
                    <Card key={index} className="p-4 space-y-3 relative">
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => handleRemoveVehicle(index)}>
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <Label>Móvil</Label>
                                <Select value={iv.vehicleId} onValueChange={(v) => handleVehicleChange(index, 'vehicleId', v)}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                                    <SelectContent>{allVehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.numeroMovil}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-1">
                                <Label>A Cargo</Label>
                                <Select value={iv.inChargeId} onValueChange={(v) => handleVehicleChange(index, 'inChargeId', v)}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                                    <SelectContent>{allFirefighters.map(f => <SelectItem key={f.id} value={f.id}>{f.lastName}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Hora Salida</Label>
                                <Input type="time" value={iv.departureTime} onChange={(e) => handleVehicleChange(index, 'departureTime', e.target.value)} />
                            </div>
                             <div className="space-y-1">
                                <Label>Hora Regreso</Label>
                                <Input type="time" value={iv.returnTime} onChange={(e) => handleVehicleChange(index, 'returnTime', e.target.value)} />
                            </div>
                        </div>
                    </Card>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddVehicle} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Agregar Móvil
                </Button>
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
        const allPersonnel = [command, serviceChief, ...onDuty, ...offDuty].filter(Boolean) as Firefighter[];
        return (
            <div className="space-y-4 text-sm">
                <h4 className="font-bold text-base">Revisar y Guardar</h4>
                <div className="p-4 bg-muted/50 rounded-lg space-y-3 max-h-96 overflow-y-auto">
                   <p><strong>Servicio:</strong> {serviceId}</p>
                   <p><strong>Tipo:</strong> {serviceType}</p>
                   <p><strong>Fecha y Hora:</strong> {date} de {startTime} a {endTime}</p>
                   <p><strong>Dirección:</strong> {address}</p>
                   <p><strong>Convocatoria:</strong> {selectedSummonMethods.join(', ')}</p>
                   <Separator className="my-2"/>
                   <p><strong>Comando:</strong> {command ? `${command.lastName}, ${command.firstName}` : 'N/A'}</p>
                   <p><strong>Jefe de Servicio:</strong> {serviceChief ? `${serviceChief.lastName}, ${serviceChief.firstName}` : 'N/A'}</p>
                   <p><strong>Dotación de Servicio:</strong> {onDuty.map(f => f.lastName).join(', ') || 'N/A'}</p>
                   <p><strong>Dotación de Pasiva:</strong> {offDuty.map(f => f.lastName).join(', ') || 'N/A'}</p>
                   <p><strong>Total de Personal:</strong> {allPersonnel.length} integrantes</p>
                   <Separator className="my-2"/>
                   <div>
                     <p><strong>Móviles Intervinientes:</strong></p>
                     {interveningVehicles.length > 0 ? (
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            {interveningVehicles.map((iv, i) => {
                                const vehicle = allVehicles.find(v => v.id === iv.vehicleId);
                                const inCharge = allFirefighters.find(f => f.id === iv.inChargeId);
                                return (
                                    <li key={i}>
                                        Móvil {vehicle?.numeroMovil} (a cargo de {inCharge?.lastName}) - Salida: {iv.departureTime}, Regreso: {iv.returnTime}
                                    </li>
                                );
                            })}
                        </ul>
                     ) : <p className="text-muted-foreground">Ninguno</p>}
                   </div>
                   <Separator className="my-2"/>
                   <p><strong>Colaboración:</strong> {collaboration || 'Ninguna'}</p>
                   <p><strong>Observaciones:</strong> {observations || 'Ninguna'}</p>
                </div>
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
