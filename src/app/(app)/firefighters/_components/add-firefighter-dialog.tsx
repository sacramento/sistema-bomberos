
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
import { useEffect, useState } from "react";
import { addFirefighter, getFirefighters } from "@/services/firefighters.service";
import { Firefighter } from "@/lib/types";

const ranks = [
    'ASPIRANTE', 'BOMBERO', 'CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO',
    'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR', 'OFICIAL AYUDANTE', 'OFICIAL INSPECTOR',
    'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'
];

export default function AddFirefighterDialog({ children, onFirefighterAdded }: { children: React.ReactNode; onFirefighterAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [legajo, setLegajo] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rank, setRank] = useState<Firefighter['rank'] | ''>('');
  const [firehouse, setFirehouse] = useState('');
  const [existingFirehouses, setExistingFirehouses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchExistingFirehouses = async () => {
        if (open) {
          try {
            const firefighters = await getFirefighters();
            const uniqueFirehouses = Array.from(new Set(firefighters.map(f => f.firehouse)));
            setExistingFirehouses(uniqueFirehouses);
          } catch (error) {
            console.error("Failed to fetch existing firehouses", error);
            // Optionally set a default or show an error
          }
        }
    };
    fetchExistingFirehouses();
  }, [open]);
  
  const resetForm = () => {
    setLegajo('');
    setFirstName('');
    setLastName('');
    setRank('');
    setFirehouse('');
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!legajo || !firstName || !lastName || !rank || !firehouse) {
        toast({
            title: "Error",
            description: "Por favor, complete todos los campos.",
            variant: "destructive",
        });
        return;
    }
    
    setLoading(true);

    try {
        const newFirefighterData: Omit<Firefighter, 'id' | 'status'> = {
            legajo,
            firstName,
            lastName,
            rank: rank as Firefighter['rank'],
            firehouse,
        };
        
        await addFirefighter(newFirefighterData);

        toast({
            title: "¡Éxito!",
            description: "El nuevo bombero ha sido agregado a la lista.",
        });
        
        onFirefighterAdded(); // Callback to refresh the list
        resetForm();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error",
            description: error.message || "No se pudo agregar el bombero. Intente de nuevo.",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Agregar Nuevo Bombero</DialogTitle>
            <DialogDescription>
              Ingrese los detalles del nuevo bombero. Haga clic en guardar cuando haya terminado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="id" className="text-right">
                Legajo
              </Label>
              <Input id="id" placeholder="Ej: FG-008 o A-123" className="col-span-3" value={legajo} onChange={e => setLegajo(e.target.value)} required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">
                Nombre
              </Label>
              <Input id="firstName" placeholder="Ej: Juan" className="col-span-3" value={firstName} onChange={e => setFirstName(e.target.value)} required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastName" className="text-right">
                Apellido
              </Label>
              <Input id="lastName" placeholder="Ej: Pérez" className="col-span-3" value={lastName} onChange={e => setLastName(e.target.value)} required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rank" className="text-right">
                Rango
              </Label>
              <Select onValueChange={(value) => setRank(value as Firefighter['rank'])} value={rank} required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un rango" />
                </SelectTrigger>
                <SelectContent>
                  {ranks.map(rank => (
                    <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firehouse" className="text-right">
                Cuartel
              </Label>
              <Select onValueChange={setFirehouse} value={firehouse} required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un cuartel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cuartel 1">Cuartel 1</SelectItem>
                  <SelectItem value="Cuartel 2">Cuartel 2</SelectItem>
                  <SelectItem value="Cuartel 3">Cuartel 3</SelectItem>
                   {existingFirehouses.filter(h => !['Cuartel 1', 'Cuartel 2', 'Cuartel 3'].includes(h)).map(house => (
                    <SelectItem key={house} value={house}>{house}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Bombero'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
