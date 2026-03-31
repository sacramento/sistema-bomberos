
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
import { Firefighter, Vehicle, Specialization, VehicleStatus } from "@/lib/types";
import { getFirefighters } from "@/services/firefighters.service";
import { addVehicle } from "@/services/vehicles.service";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { MultiFirefighterSelect } from "@/components/firefighter-select";

const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'GENERAL'];
const vehicleTypes = ['Liviana', 'Mediana', 'Pesada', 'Cisterna'];
const tractions = ['Trasera', 'Delantera', '4x4'];
const cuarteles = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
const statuses: VehicleStatus[] = ['Operativo', 'No operativo', 'Fuera de Dotación'];

export default function AddVehicleDialog({ children, onVehicleAdded }: { children: React.ReactNode; onVehicleAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user: actor } = useAuth();
  const [loading, setLoading] = useState(false);
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  
  const [formData, setFormData] = useState<Omit<Vehicle, 'id' | 'encargados' | 'materialEncargados' | 'maintenanceItems'>>({
    numeroMovil: '',
    dominio: '',
    marca: '',
    modelo: '',
    ano: new Date().getFullYear(),
    kilometraje: 0,
    cuartel: 'Cuartel 1',
    especialidad: 'GENERAL',
    capacidadAgua: 0,
    tipoVehiculo: 'Liviana',
    traccion: '4x4',
    status: 'Operativo',
    encargadoIds: [],
    materialEncargadoIds: [],
    observaciones: ''
  });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: e.target.type === 'number' ? parseInt(value) || 0 : value }));
  };

  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const resetForm = useCallback(() => {
    setFormData({
        numeroMovil: '',
        dominio: '',
        marca: '',
        modelo: '',
        ano: new Date().getFullYear(),
        kilometraje: 0,
        cuartel: 'Cuartel 1',
        especialidad: 'GENERAL',
        capacidadAgua: 0,
        tipoVehiculo: 'Liviana',
        traccion: '4x4',
        status: 'Operativo',
        encargadoIds: [],
        materialEncargadoIds: [],
        observaciones: ''
    });
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetForm();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.numeroMovil || !formData.dominio || !formData.marca || !formData.modelo || !actor) {
        toast({ title: "Error", description: "Complete los campos obligatorios.", variant: "destructive" });
        return;
    }
    
    setLoading(true);
    try {
      await addVehicle(formData, actor);
      toast({ title: "¡Éxito!", description: "Móvil registrado correctamente." });
      onVehicleAdded();
      setOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <DialogHeader className="px-1">
            <DialogTitle className="font-headline">Agregar Nuevo Móvil</DialogTitle>
            <DialogDescription>Complete la ficha técnica del vehículo y asigne a los responsables.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-4 py-4 scrollbar-thin">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground border-b pb-1">Identificación</h4>
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
                    <h4 className="text-xs font-bold uppercase text-muted-foreground border-b pb-1">Estado y Ubicación</h4>
                    <div className="space-y-2">
                        <Label htmlFor="kilometraje">Kilometraje</Label>
                        <Input id="kilometraje" type="number" value={formData.kilometraje || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status">Estado Operativo</Label>
                        <Select value={formData.status} onValueChange={(v) => handleSelectChange('status', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cuartel">Cuartel Asignado</Label>
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
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground border-b pb-1">Responsables</h4>
                    <div className="space-y-2">
                        <Label>Encargados de Mecánica</Label>
                        <MultiFirefighterSelect
                            title="encargados"
                            selected={activeFirefighters.filter(f => formData.encargadoIds.includes(f.id))}
                            onSelectedChange={(fs) => setFormData(p => ({...p, encargadoIds: fs.map(f => f.id)}))}
                            firefighters={activeFirefighters}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Encargados de Materiales</Label>
                        <MultiFirefighterSelect
                            title="encargados materiales"
                            selected={activeFirefighters.filter(f => formData.materialEncargadoIds.includes(f.id))}
                            onSelectedChange={(fs) => setFormData(p => ({...p, materialEncargadoIds: fs.map(f => f.id)}))}
                            firefighters={activeFirefighters}
                        />
                    </div>
                </div>

                <div className="space-y-4 md:col-span-2 lg:col-span-3">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground border-b pb-1">Especificaciones Técnicas</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                </div>

                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                    <Label htmlFor="observaciones">Observaciones Adicionales</Label>
                    <Textarea id="observaciones" value={formData.observaciones} onChange={handleInputChange} className="min-h-[100px]" />
                </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t px-1">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Guardar Móvil
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
