
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { Firefighter, Vehicle, RepairType, LoggedInUser } from "@/lib/types";
import { getFirefighters } from "@/services/firefighters.service";
import { addRepairRecord } from "@/services/repairs.service";
import { CalendarIcon, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

const repairTypes: RepairType[] = ['Mecanica', 'Electrica', 'Neumatica', 'Hidraulica', 'Carrocería'];

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
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-10">
                    <div className="flex gap-1 flex-wrap">
                        {selected.length > 0 ? selected.map(f => <Badge variant="secondary" key={f.id}>{f.lastName}</Badge>) : `Seleccionar ${title.toLowerCase()}...`}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Buscar ${title.toLowerCase()}...`} />
                    <CommandList>
                        <CommandEmpty>No se encontraron bomberos.</CommandEmpty>
                        <CommandGroup>
                            {firefighters.map((firefighter) => (
                                <CommandItem key={firefighter.id} value={`${firefighter.legajo} ${firefighter.firstName} ${firefighter.lastName}`}
                                    onSelect={() => handleSelect(firefighter)}>
                                    <Check className={cn("mr-2 h-4 w-4", selected.some(s => s.id === firefighter.id) ? "opacity-100" : "opacity-0")} />
                                    {`${firefighter.lastName}, ${firefighter.firstName}`}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default function AddRepairRecordDialog({ children, vehicle, onRecordAdded, actor }: { children: React.ReactNode; vehicle: Vehicle; onRecordAdded: () => void; actor: LoggedInUser }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  
  // Form State
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [mileage, setMileage] = useState<number>(0);
  const [repairType, setRepairType] = useState<RepairType | ''>('');
  const [details, setDetails] = useState('');
  const [externalPersonnel, setExternalPersonnel] = useState('');
  const [personnel, setPersonnel] = useState<Firefighter[]>([]);

  const activeFirefighters = useMemo(() => allFirefighters.filter(f => f.status === 'Active' || f.status === 'Auxiliar'), [allFirefighters]);

  useEffect(() => {
    if (open) {
        setMileage(vehicle.kilometraje);
        
        getFirefighters()
            .then(setAllFirefighters)
            .catch(() => toast({ title: "Error", description: "No se pudieron cargar los bomberos.", variant: "destructive" }));
    }
  }, [open, vehicle.kilometraje, toast]);
  
  const resetForm = () => {
    setDate(new Date());
    setMileage(0);
    setRepairType('');
    setDetails('');
    setExternalPersonnel('');
    setPersonnel([]);
  }
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!date || mileage <= 0 || !repairType || !details || personnel.length === 0) {
        toast({ title: "Error", description: "Fecha, kilometraje, tipo, detalle y personal son campos obligatorios.", variant: "destructive" });
        return;
    }
    
    setLoading(true);
    try {
        if (!actor) throw new Error("No se pudo identificar al usuario.");

        const newRecord = {
            vehicleId: vehicle.id,
            date: format(date, 'yyyy-MM-dd'),
            mileage,
            repairType: repairType as RepairType,
            details,
            externalPersonnel,
            personnelIds: personnel.map(p => p.id),
        };
        
        await addRepairRecord(newRecord, actor);
        toast({ title: "¡Éxito!", description: "El registro de reparación ha sido guardado." });
        onRecordAdded();
        resetForm();
        setOpen(false);

    } catch (error: any) {
        toast({ title: "Error", description: error.message || "No se pudo guardar el registro.", variant: "destructive" });
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Registrar Reparación para Móvil {vehicle.numeroMovil}</DialogTitle>
          <DialogDescription>
            Complete los detalles de la reparación realizada.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-2 py-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">Fecha de Reparación</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={es} /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mileage">Kilometraje Actual</Label>
                        <Input id="mileage" type="number" value={mileage || ''} onChange={e => setMileage(Number(e.target.value))} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="repairType">Tipo de Reparación</Label>
                        <Select value={repairType} onValueChange={(v) => setRepairType(v as RepairType)}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                            <SelectContent>{repairTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="details">Detalle de la Reparación</Label>
                    <Textarea id="details" value={details} onChange={e => setDetails(e.target.value)} placeholder="Describa el trabajo realizado..." required/>
                </div>
                <div className="space-y-2">
                    <Label>Personal Interviniente</Label>
                    <MultiFirefighterSelect title="bomberos" selected={personnel} onSelectedChange={setPersonnel} firefighters={activeFirefighters}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="externalPersonnel">Personal Externo (Opcional)</Label>
                    <Input id="externalPersonnel" value={externalPersonnel} onChange={e => setExternalPersonnel(e.target.value)} placeholder="Ej: Mecánico Juan Pérez"/>
                </div>
            </form>
        </div>
        <DialogFooter className="border-t pt-4">
            <Button onClick={(e) => {
              e.preventDefault();
              const form = e.currentTarget.closest('div.flex-col')?.querySelector('form');
              form?.requestSubmit();
            }} disabled={loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</> : 'Guardar Registro'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
