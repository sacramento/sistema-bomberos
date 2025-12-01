
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Firefighter, Vehicle, Service, ServiceType, SummonMethod, InterveningVehicle } from "@/lib/types";
import { getFirefighters } from "@/services/firefighters.service";
import { getVehicles } from "@/services/vehicles.service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updateService } from "@/services/services.service";

const serviceTypes: ServiceType[] = ['Incendio', 'Rescate', 'Accidente', 'HazMat', 'Forestal', 'Especial', 'G.O.R.A', 'Buceo', 'Otros'];
const summonMethods: SummonMethod[] = ['Alarma', 'VHF', 'Teléfono', 'En el Cuartel'];
const cuarteles: Service['cuartel'][] = ['C1', 'C2', 'C3'];
const zones = Array.from({ length: 12 }, (_, i) => i + 1);

const serviceCodes = [
    { group: 'Accidente', codes: ['1.1 AEREO', '1.2 EMBARCACIÓN', '1.3 TRÁNSITO', '1.4 OTROS'] },
    { group: 'Fenómeno Natural', codes: ['2.1 CICLÓN', '2.2 TORNADOS Y HURACANES', '2.3 NEVADAS', '2.4 GRANIZO', '2.5 TORMENTAS', '2.6 VOLCÁN', '2.7 AVALANCHA Y ALUD', '2.8 INUNDACIÓN', '2.9 OTROS'] },
    { group: 'Incendio', codes: ['3.1 AERONAVES', '3.2 COMERCIO', '3.3 EMBARCACIÓN', '3.4 ESTABLECIMIENTO EDUCATIVO', '3.5 ESTABLECIMIENTO PÚBLICO', '3.6 FORESTAL', '3.7 HOSPITAL Y CLINICA', '3.8 INDUSTRIA', '3.9 VEHICULO', '3.10 VIVIENDA', '3.11 OTROS'] },
    { group: 'Materiales Peligrosos', codes: ['4.1 ESCAPE O FUGA', '4.2 DERRAME', '4.3 EXPLOSIÓN'] },
    { group: 'Rescate', codes: ['5.1 PERSONAS', '5.2 ANIMALES', '5.3 SERV. DE AMBULANCIA'] },
    { group: 'Servicio Especial', codes: ['6.1 CAPACITACION', '6.2 SERV. ESPECIALES', '6.3 PREVENCIÓN', '6.4 FALSA ALARMA', '6.5 REPRESENTACIÓN', '6.6 FALSO AVISO', '6.7 OTROS', '6.8 SUMINISTRO DE AGUA', '6.9 EXTRACCION DE PANALES', '6.10 RETIRO DE OBITO', '6.11 COLABORACIÓN C/FZAS. DE SEGURIDAD', '6.12 COLOCACIÓN DE DRIZA'] },
];

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
  displayKey = 'lastName',
  valueKey = 'id',
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

export default function EditServiceDialog({ children, service, onServiceUpdated }: { children: React.ReactNode; service: Service; onServiceUpdated: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Data sources
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);

  // Form state
  const [formData, setFormData] = useState<Partial<Service>>(service);

  useEffect(() => {
    if (open) {
      setFormData(service);
      
      const fetchData = async () => {
        try {
          const [firefightersData, vehiclesData] = await Promise.all([getFirefighters(), getVehicles()]);
          setAllFirefighters(firefightersData);
          setAllVehicles(vehiclesData);
        } catch (error) {
          toast({ title: "Error", description: "No se pudieron cargar los datos para el formulario.", variant: "destructive" });
        }
      };
      fetchData();
    }
  }, [open, service, toast]);

  const handleInputChange = (field: keyof Service, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleNumericInputChange = (field: 'latitude' | 'longitude', value: string) => {
      setFormData(prev => ({...prev, [field]: value === '' ? '' : parseFloat(value)}));
  }

  const handleVehicleChange = (index: number, field: keyof InterveningVehicle, value: string) => {
    const updatedVehicles = [...(formData.interveningVehicles || [])];
    updatedVehicles[index] = { ...updatedVehicles[index], [field]: value };
    handleInputChange('interveningVehicles', updatedVehicles);
  };
  
  const handleAddVehicle = () => {
    const updatedVehicles = [...(formData.interveningVehicles || []), { vehicleId: '', departureDateTime: '', returnDateTime: '' }];
    handleInputChange('interveningVehicles', updatedVehicles);
  };

  const handleRemoveVehicle = (index: number) => {
    const updatedVehicles = (formData.interveningVehicles || []).filter((_, i) => i !== index);
    handleInputChange('interveningVehicles', updatedVehicles);
  };

  const handleSubmit = async () => {
     setLoading(true);
    if (!formData.cuartel || !formData.manualId || !formData.startDateTime || !formData.commandId || !formData.serviceChiefId || !formData.stationOfficerId || !formData.serviceCode) {
        toast({
            variant: "destructive",
            title: "Datos incompletos",
            description: "Asegúrese de completar el cuartel, número de planilla, fecha y hora de inicio, código, comando, jefe de servicio y cuartelero.",
        });
        setLoading(false);
        return;
    }

    try {
        const serviceData = {
            ...formData,
            year: new Date(formData.startDateTime!).getFullYear(),
            manualId: Number(formData.manualId),
            zone: Number(formData.zone),
        };
        
        await updateService(service.id, serviceData);
        toast({ title: "¡Éxito!", description: "El servicio ha sido actualizado." });
        onServiceUpdated();
        setOpen(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error al Guardar", description: error.message || "No se pudo actualizar el servicio." });
    } finally {
        setLoading(false);
    }
  };

  const findFirefighter = (id: string) => allFirefighters.find(f => f.id === id) || null;
  const findFirefighters = (ids: string[]) => allFirefighters.filter(f => ids.includes(f.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Editar Servicio</DialogTitle>
           <DialogDescription>Modifique los detalles del servicio.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow py-4 overflow-y-auto pr-2 space-y-4">
             {/* Step 1 Content */}
             <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="cuartel">Cuartel</Label>
                        <Select value={formData.cuartel} onValueChange={(v) => handleInputChange('cuartel', v as any)}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                            <SelectContent>{cuarteles.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="manualId">Número de Planilla</Label>
                        <Input id="manualId" type="number" value={formData.manualId || ''} onChange={e => handleInputChange('manualId', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="startDateTime">Fecha y Hora de Inicio</Label>
                        <Input id="startDateTime" type="datetime-local" value={formData.startDateTime} onChange={e => handleInputChange('startDateTime', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="endDateTime">Fecha y Hora de Fin</Label>
                        <Input id="endDateTime" type="datetime-local" value={formData.endDateTime} onChange={e => handleInputChange('endDateTime', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="zone">Zona</Label>
                        <Select value={formData.zone?.toString()} onValueChange={v => handleInputChange('zone', Number(v))}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                            <SelectContent>{zones.map(z => <SelectItem key={z} value={z.toString()}>{z}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="serviceType">Tipo de Servicio</Label>
                    <Select value={formData.serviceType} onValueChange={v => handleInputChange('serviceType', v as any)}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                        <SelectContent>{serviceTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="serviceCode">Código de Servicio</Label>
                    <Select value={formData.serviceCode} onValueChange={v => handleInputChange('serviceCode', v)}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                        <SelectContent>
                            {serviceCodes.map(group => (
                                <SelectGroup key={group.group}>
                                    <Label className="px-2 py-1.5 text-sm font-semibold">{group.group}</Label>
                                    {group.codes.map(code => <SelectItem key={code} value={code}>{code}</SelectItem>)}
                                </SelectGroup>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input id="address" placeholder="Calle y número, o referencia" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="latitude">Latitud (Opcional)</Label>
                        <Input id="latitude" type="number" step="any" placeholder="-34.5678" value={formData.latitude ?? ''} onChange={e => handleNumericInputChange('latitude', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="longitude">Longitud (Opcional)</Label>
                        <Input id="longitude" type="number" step="any" placeholder="-58.1234" value={formData.longitude ?? ''} onChange={e => handleNumericInputChange('longitude', e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Step 2 Content */}
            <Separator />
            <div className="space-y-4">
                 <div className="space-y-2">
                    <Label>Comando</Label>
                    <SingleFirefighterSelect title="Comando" selected={findFirefighter(formData.commandId || '')} onSelectedChange={(f) => handleInputChange('commandId', f?.id)} firefighters={allFirefighters} />
                </div>
                <div className="space-y-2">
                    <Label>Jefe de Servicio</Label>
                    <SingleFirefighterSelect title="Jefe de Servicio" selected={findFirefighter(formData.serviceChiefId || '')} onSelectedChange={(f) => handleInputChange('serviceChiefId', f?.id)} firefighters={allFirefighters} disabledIds={[formData.commandId || '']}/>
                </div>
                <div className="space-y-2">
                    <Label>Cuartelero</Label>
                    <SingleFirefighterSelect title="Cuartelero" selected={findFirefighter(formData.stationOfficerId || '')} onSelectedChange={(f) => handleInputChange('stationOfficerId', f?.id)} firefighters={allFirefighters} disabledIds={[formData.commandId || '', formData.serviceChiefId || '']}/>
                </div>
                <div className="space-y-2">
                    <Label>Dotación de Servicio</Label>
                    <MultiSelect title="Integrantes" options={allFirefighters} selected={findFirefighters(formData.onDutyIds || [])} onSelectedChange={(firefighters) => handleInputChange('onDutyIds', firefighters.map(f => f.id))} disabledIds={[formData.commandId || '', formData.serviceChiefId || '', formData.stationOfficerId || '']}/>
                </div>
                 <div className="space-y-2">
                    <Label>Dotación de Pasiva</Label>
                    <MultiSelect title="Integrantes" options={allFirefighters} selected={findFirefighters(formData.offDutyIds || [])} onSelectedChange={(firefighters) => handleInputChange('offDutyIds', firefighters.map(f => f.id))} disabledIds={[formData.commandId || '', formData.serviceChiefId || '', formData.stationOfficerId || '', ...(formData.onDutyIds || [])]}/>
                </div>
            </div>

            {/* Step 3 Content */}
            <Separator />
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Móviles Intervinientes</Label>
                    {formData.interveningVehicles?.map((iv, index) => (
                        <Card key={index} className="p-4 space-y-3 relative">
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => handleRemoveVehicle(index)}>
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1 sm:col-span-1">
                                    <Label>Móvil</Label>
                                    <Select value={iv.vehicleId} onValueChange={(v) => handleVehicleChange(index, 'vehicleId', v)}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                                        <SelectContent>{allVehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.numeroMovil}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Fecha y Hora Salida</Label>
                                    <Input type="datetime-local" value={iv.departureDateTime} onChange={(e) => handleVehicleChange(index, 'departureDateTime', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Fecha y Hora Regreso</Label>
                                    <Input type="datetime-local" value={iv.returnDateTime} onChange={(e) => handleVehicleChange(index, 'returnDateTime', e.target.value)} />
                                </div>
                            </div>
                        </Card>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleAddVehicle} className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> Agregar Móvil
                    </Button>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="observations">Observaciones Generales</Label>
                    <Textarea id="observations" value={formData.observations || ''} onChange={e => handleInputChange('observations', e.target.value)} />
                </div>
            </div>
        </div>
        <DialogFooter className="pt-4 border-t">
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
