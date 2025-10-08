
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
import { Firefighter, Vehicle, Specialization } from "@/lib/types";
import { getFirefighters } from "@/services/firefighters.service";
import { addVehicle } from "@/services/vehicles.service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";

const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE', 'VARIOS'];
const vehicleTypes = ['Liviana', 'Mediana', 'Pesada', 'Cisterna'];
const tractions = ['Trasera', 'Delantera', '4x4'];
const cuarteles = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

export default function AddVehicleDialog({ children, onVehicleAdded }: { children: React.ReactNode; onVehicleAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  const [openCombobox, setOpenCombobox] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Omit<Vehicle, 'id' | 'encargado'>>({
    numeroMovil: '',
    marca: '',
    modelo: '',
    ano: new Date().getFullYear(),
    kilometraje: 0,
    cuartel: 'Cuartel 1',
    especialidad: 'FUEGO',
    capacidadAgua: 0,
    tipoVehiculo: 'Liviana',
    traccion: '4x4',
    encargadoId: '',
    observaciones: ''
  });

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

  const resetForm = () => {
    setFormData({
        numeroMovil: '',
        marca: '',
        modelo: '',
        ano: new Date().getFullYear(),
        kilometraje: 0,
        cuartel: 'Cuartel 1',
        especialidad: 'FUEGO',
        capacidadAgua: 0,
        tipoVehiculo: 'Liviana',
        traccion: '4x4',
        encargadoId: '',
        observaciones: ''
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.numeroMovil || !formData.marca || !formData.modelo || !formData.encargadoId) {
        toast({ title: "Error", description: "Móvil, marca, modelo y encargado son campos obligatorios.", variant: "destructive" });
        return;
    }
    
    setLoading(true);

    try {
      await addVehicle(formData);
      toast({ title: "¡Éxito!", description: "El nuevo móvil ha sido agregado." });
      onVehicleAdded();
      resetForm();
      setOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error", description: error.message || "No se pudo agregar el móvil.", variant: "destructive" });
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Agregar Nuevo Móvil</DialogTitle>
          <DialogDescription>Complete la ficha técnica del nuevo vehículo de la flota.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            {/* Column 1 */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="numeroMovil">Número de Móvil</Label>
                    <Input id="numeroMovil" value={formData.numeroMovil} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="marca">Marca</Label>
                    <Input id="marca" value={formData.marca} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="modelo">Modelo</Label>
                    <Input id="modelo" value={formData.modelo} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="ano">Año</Label>
                    <Input id="ano" type="number" value={formData.ano} onChange={handleInputChange} />
                </div>
            </div>
            {/* Column 2 */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="kilometraje">Kilometraje</Label>
                    <Input id="kilometraje" type="number" value={formData.kilometraje} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cuartel">Cuartel</Label>
                    <Select value={formData.cuartel} onValueChange={(v) => handleSelectChange('cuartel', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{cuarteles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="especialidad">Especialidad</Label>
                    <Select value={formData.especialidad} onValueChange={(v) => handleSelectChange('especialidad', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="encargadoId">Encargado</Label>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={openCombobox} className="w-full justify-between">
                                {formData.encargadoId ? allFirefighters.find(f => f.id === formData.encargadoId)?.lastName : "Seleccionar encargado..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar bombero..." />
                                <CommandList>
                                <CommandEmpty>No se encontró.</CommandEmpty>
                                {allFirefighters.map((firefighter) => (
                                    <CommandItem key={firefighter.id} value={`${firefighter.firstName} ${firefighter.lastName}`} onSelect={() => { handleSelectChange('encargadoId', firefighter.id); setOpenCombobox(false); }}>
                                        <Check className={cn("mr-2 h-4 w-4", formData.encargadoId === firefighter.id ? "opacity-100" : "opacity-0")} />
                                        {`${firefighter.lastName}, ${firefighter.firstName}`}
                                    </CommandItem>
                                ))}
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            {/* Column 3 */}
            <div className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="capacidadAgua">Capacidad de Agua (L)</Label>
                    <Input id="capacidadAgua" type="number" value={formData.capacidadAgua} onChange={handleInputChange} />
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
                <Textarea id="observaciones" value={formData.observaciones} onChange={handleInputChange} placeholder="Anotaciones sobre mantenimiento, estado general, etc." />
            </div>
          </div>
        </form>
         <DialogFooter className="pt-4 border-t">
            <Button onClick={e => handleSubmit(e as any)} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Móvil'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
