
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
import { Firefighter, Vehicle, Specialization } from "@/lib/types";
import { getFirefighters } from "@/services/firefighters.service";
import { updateVehicle } from "@/services/vehicles.service";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'GENERAL'];
const vehicleTypes = ['Liviana', 'Mediana', 'Pesada', 'Cisterna'];
const tractions = ['Trasera', 'Delantera', '4x4'];
const cuarteles = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

const MultiFirefighterSelect = ({ 
    title, 
    selected, 
    onSelectedChange,
    firefighters,
    disabled,
}: { 
    title: string;
    selected: Firefighter[]; 
    onSelectedChange: (selected: Firefighter[]) => void;
    firefighters: Firefighter[];
    disabled?: boolean;
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
    
    const getDisplayText = (f: Firefighter) => `${f.legajo} - ${f.lastName}, ${f.firstName}`;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto min-h-10"
                    disabled={disabled}
                >
                    <div className="flex gap-1 flex-wrap">
                        {selected.length > 0 ? (
                            selected.map(f => <Badge variant="secondary" key={f.id}>{f.legajo} - {f.lastName}</Badge>)
                        ) : (
                            `Seleccionar ${title.toLowerCase()}...`
                        )}
                    </div>
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
                                <CommandItem
                                    key={firefighter.id}
                                    value={`${firefighter.legajo} ${firefighter.firstName} ${firefighter.lastName}`}
                                    onSelect={() => {
                                        handleSelect(firefighter);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selected.some(s => s.id === firefighter.id) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {getDisplayText(firefighter)}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default function EditVehicleDialog({ children, vehicle, onVehicleUpdated }: { children: React.ReactNode; vehicle: Vehicle; onVehicleUpdated: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  
  const { getActiveRole } = useAuth();
  const pathname = usePathname();
  const activeRole = getActiveRole(pathname);

  const canEditAllFields = activeRole === 'Master' || activeRole === 'Administrador';
  
  const activeFirefighters = useMemo(() => allFirefighters.filter(f => f.status === 'Active' || f.status === 'Auxiliar'), [allFirefighters]);

  const [formData, setFormData] = useState<Partial<Vehicle>>({});
  const [selectedEncargados, setSelectedEncargados] = useState<Firefighter[]>([]);
  const [selectedMaterialEncargados, setSelectedMaterialEncargados] = useState<Firefighter[]>([]);

  useEffect(() => {
    if (open) {
      setFormData(vehicle);
      setSelectedEncargados(vehicle.encargados || []);
      setSelectedMaterialEncargados(vehicle.materialEncargados || []);
    }
  }, [open, vehicle]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: e.target.type === 'number' ? parseInt(value) || 0 : value }));
  };

  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const resetForm = useCallback(() => {
    setFormData(vehicle);
    setSelectedEncargados(vehicle.encargados || []);
    setSelectedMaterialEncargados(vehicle.materialEncargados || []);
  }, [vehicle]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  }, [resetForm]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.numeroMovil || !formData.dominio || !formData.marca || !formData.modelo) {
        toast({ title: "Error", description: "Móvil, dominio, marca y modelo son campos obligatorios.", variant: "destructive" });
        return;
    }
    setLoading(true);
    try {
      const finalData = { 
          ...formData, 
          encargadoIds: selectedEncargados.map(f => f.id),
          materialEncargadoIds: selectedMaterialEncargados.map(f => f.id)
      };
      
      await updateVehicle(vehicle.id, finalData, null);

      toast({ title: "¡Éxito!", description: "La ficha del móvil ha sido actualizada." });
      onVehicleUpdated();
      setOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo actualizar el móvil.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Editar Móvil: {vehicle.numeroMovil}</DialogTitle>
          <DialogDescription>Modifique la ficha técnica del vehículo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="numeroMovil">Número de Móvil</Label>
                    <Input id="numeroMovil" value={formData.numeroMovil || ''} onChange={handleInputChange} required disabled={!canEditAllFields}/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="dominio">Dominio (Patente)</Label>
                    <Input id="dominio" value={formData.dominio || ''} onChange={handleInputChange} required disabled={!canEditAllFields}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="marca">Marca</Label>
                    <Input id="marca" value={formData.marca || ''} onChange={handleInputChange} required disabled={!canEditAllFields}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="modelo">Modelo</Label>
                    <Input id="modelo" value={formData.modelo || ''} onChange={handleInputChange} required disabled={!canEditAllFields}/>
                </div>
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="kilometraje">Kilometraje</Label>
                    <Input id="kilometraje" type="number" value={formData.kilometraje || 0} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cuartel">Cuartel</Label>
                    <Select value={formData.cuartel} onValueChange={(v) => handleSelectChange('cuartel', v)} disabled={!canEditAllFields}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{cuarteles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Encargado de Mantenimiento</Label>
                    <MultiFirefighterSelect
                        title="encargados"
                        selected={selectedEncargados}
                        onSelectedChange={setSelectedEncargados}
                        firefighters={activeFirefighters}
                        disabled={!canEditAllFields}
                    />
                </div>
                 <div className="space-y-2">
                    <Label>Encargado de Materiales</Label>
                    <MultiFirefighterSelect
                        title="encargados de inventario"
                        selected={selectedMaterialEncargados}
                        onSelectedChange={setSelectedMaterialEncargados}
                        firefighters={activeFirefighters}
                        disabled={!canEditAllFields}
                    />
                </div>
            </div>
            <div className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="capacidadAgua">Capacidad de Agua (L)</Label>
                    <Input id="capacidadAgua" type="number" value={formData.capacidadAgua || 0} onChange={handleInputChange} disabled={!canEditAllFields}/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="tipoVehiculo">Tipo de Vehículo</Label>
                     <Select value={formData.tipoVehiculo} onValueChange={(v) => handleSelectChange('tipoVehiculo', v)} disabled={!canEditAllFields}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{vehicleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="traccion">Tracción</Label>
                    <Select value={formData.traccion} onValueChange={(v) => handleSelectChange('traccion', v)} disabled={!canEditAllFields}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{tractions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea id="observations" value={formData.observaciones || ''} onChange={handleInputChange} />
            </div>
          </div>
        </form>
         <DialogFooter className="pt-4 border-t">
            <Button onClick={e => handleSubmit(e as any)} disabled={loading}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
