
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
import { addVehicle } from "@/services/vehicles.service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";

const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'GENERAL'];
const vehicleTypes = ['Liviana', 'Mediana', 'Pesada', 'Cisterna'];
const tractions = ['Trasera', 'Delantera', '4x4'];
const cuarteles = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

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
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto min-h-10"
                >
                    <div className="flex gap-1 flex-wrap">
                        {selected.length > 0 ? (
                            selected.map(f => <Badge variant="secondary" key={f.id}>{f.legajo} - {f.lastName}, {f.firstName}</Badge>)
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


export default function AddVehicleDialog({ children, onVehicleAdded }: { children: React.ReactNode; onVehicleAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user: actor } = useAuth();
  const [loading, setLoading] = useState(false);
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  
  // Form State
  const [formData, setFormData] = useState<Omit<Vehicle, 'id' | 'encargados' | 'materialEncargados' | 'maintenanceItems'>>({
    numeroMovil: '',
    dominio: '',
    marca: '',
    modelo: '',
    ano: new Date().getFullYear(),
    kilometraje: 0,
    cuartel: 'Cuartel 1',
    especialidad: 'FUEGO',
    capacidadAgua: 0,
    tipoVehiculo: 'Liviana',
    traccion: '4x4',
    encargadoIds: [],
    materialEncargadoIds: [],
    observaciones: ''
  });

  const activeFirefighters = useMemo(() => allFirefighters.filter(f => f.status === 'Active' || f.status === 'Auxiliar'), [allFirefighters]);

  useEffect(() => {
    const fetchAllFirefighters = async () => {
        if (open) {
            try {
                const data = await getFirefighters();
                setAllFirefighters(data);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los bomberos para la selección.",
                    variant: "destructive"
                });
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

  const handleEncargadosChange = (encargados: Firefighter[]) => {
    setFormData(prev => ({ ...prev, encargadoIds: encargados.map(f => f.id) }));
  }

  const handleMaterialEncargadosChange = (encargados: Firefighter[]) => {
    setFormData(prev => ({ ...prev, materialEncargadoIds: encargados.map(f => f.id) }));
  }

  const resetForm = useCallback(() => {
    setFormData({
        numeroMovil: '',
        dominio: '',
        marca: '',
        modelo: '',
        ano: new Date().getFullYear(),
        kilometraje: 0,
        cuartel: 'Cuartel 1',
        especialidad: 'FUEGO',
        capacidadAgua: 0,
        tipoVehiculo: 'Liviana',
        traccion: '4x4',
        encargadoIds: [],
        materialEncargadoIds: [],
        observaciones: ''
    });
  }, []);

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
    
    if (!actor) {
        toast({ title: "Error", description: "No se pudo identificar al usuario actual.", variant: "destructive" });
        return;
    }

    setLoading(true);

    try {
      await addVehicle(formData, actor);
      toast({ title: "¡Éxito!", description: "El nuevo móvil ha sido agregado." });
      onVehicleAdded();
      resetForm();
      setOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo agregar el móvil.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Agregar Nuevo Móvil</DialogTitle>
          <DialogDescription>Complete la ficha técnica del nuevo vehículo de la flota.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="numeroMovil">Número de Móvil</Label>
                    <Input id="numeroMovil" value={formData.numeroMovil} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="dominio">Dominio (Patente)</Label>
                    <Input id="dominio" value={formData.dominio} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="marca">Marca</Label>
                    <Input id="marca" value={formData.marca} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="modelo">Modelo</Label>
                    <Input id="modelo" value={formData.modelo} onChange={handleInputChange} required />
                </div>
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="kilometraje">Kilometraje</Label>
                    <Input id="kilometraje" type="number" value={formData.kilometraje || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cuartel">Cuartel</Label>
                    <Select value={formData.cuartel} onValueChange={(v) => handleSelectChange('cuartel', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{cuarteles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Encargado de Mantenimiento</Label>
                    <MultiFirefighterSelect
                        title="encargados"
                        selected={activeFirefighters.filter(f => formData.encargadoIds.includes(f.id))}
                        onSelectedChange={handleEncargadosChange}
                        firefighters={activeFirefighters}
                    />
                </div>
                 <div className="space-y-2">
                    <Label>Encargado de Materiales</Label>
                    <MultiFirefighterSelect
                        title="encargados de inventario"
                        selected={activeFirefighters.filter(f => formData.materialEncargadoIds.includes(f.id))}
                        onSelectedChange={handleMaterialEncargadosChange}
                        firefighters={activeFirefighters}
                    />
                </div>
            </div>
            <div className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="capacidadAgua">Capacidad de Agua (L)</Label>
                    <Input id="capacidadAgua" type="number" value={formData.capacidadAgua || ''} onChange={handleInputChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="tipoVehiculo">Tipo de Vehículo</Label>
                     <Select value={formData.tipoVehiculo} onValueChange={(v) => handleSelectChange('tipoVehiculo', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{vehicleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="traccion">Tracción</Label>
                    <Select value={formData.traccion} onValueChange={(v) => handleSelectChange('traccion', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{tractions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea id="observaciones" value={formData.observaciones} onChange={handleInputChange} />
            </div>
          </div>
        </form>
         <DialogFooter className="pt-4 border-t">
            <Button onClick={e => handleSubmit(e as any)} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Guardar Móvil
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
