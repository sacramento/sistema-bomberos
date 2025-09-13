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
import { getFirefighters, updateFirefighter } from "@/services/firefighters.service";
import { Firefighter } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const ranks = [
    'ASPIRANTE', 'BOMBERO', 'CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO',
    'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR', 'OFICIAL AYUDANTE', 'OFICIAL INSPECTOR',
    'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'
];

const statuses = ['Active', 'Inactive'];

export default function EditFirefighterDialog({ children, firefighter, onFirefighterUpdated }: { children: React.ReactNode; firefighter: Firefighter; onFirefighterUpdated: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const [legajo, setLegajo] = useState(firefighter.legajo || '');
  const [firstName, setFirstName] = useState(firefighter.firstName);
  const [lastName, setLastName] = useState(firefighter.lastName);
  const [rank, setRank] = useState<Firefighter['rank']>(firefighter.rank);
  const [firehouse, setFirehouse] = useState(firefighter.firehouse);
  const [status, setStatus] = useState<Firefighter['status']>(firefighter.status);
  
  const [existingFirehouses, setExistingFirehouses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // This effect ensures the form resets if the dialog is closed and reopened with a different firefighter
    if (open) {
        setLegajo(firefighter.legajo || '');
        setFirstName(firefighter.firstName);
        setLastName(firefighter.lastName);
        setRank(firefighter.rank);
        setFirehouse(firefighter.firehouse);
        setStatus(firefighter.status);
    }
  }, [open, firefighter]);

  useEffect(() => {
    const fetchExistingFirehouses = async () => {
        if (open) {
          try {
            const firefighters = await getFirefighters();
            const uniqueFirehouses = Array.from(new Set(firefighters.map(f => f.firehouse)));
            setExistingFirehouses(uniqueFirehouses);
          } catch (error) {
            console.error("Failed to fetch existing firehouses", error);
          }
        }
    };
    fetchExistingFirehouses();
  }, [open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!legajo || !firstName || !lastName || !rank || !firehouse || !status) {
        toast({
            title: "Error",
            description: "Por favor, complete todos los campos.",
            variant: "destructive",
        });
        return;
    }
    
    setLoading(true);

    try {
        const updatedData: Partial<Omit<Firefighter, 'id'>> = {
            legajo,
            firstName,
            lastName,
            rank,
            firehouse,
            status,
        };
        
        await updateFirefighter(firefighter.id, updatedData);
        
        toast({
            title: "¡Éxito!",
            description: "El bombero ha sido actualizado.",
        });
        
        onFirefighterUpdated();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error",
            description: error.message || "No se pudo actualizar el bombero. Intente de nuevo.",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Editar Bombero</DialogTitle>
            <DialogDescription>
              Modifique los detalles del bombero. Haga clic en guardar cuando haya terminado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="legajo" className="text-right">
                Legajo
              </Label>
              <Input 
                id="legajo" 
                className="col-span-3" 
                value={legajo} 
                onChange={e => setLegajo(e.target.value)} 
                required 
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">
                Nombre
              </Label>
              <Input id="firstName" className="col-span-3" value={firstName} onChange={e => setFirstName(e.target.value)} required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastName" className="text-right">
                Apellido
              </Label>
              <Input id="lastName" className="col-span-3" value={lastName} onChange={e => setLastName(e.target.value)} required/>
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
                  {ranks.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
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
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Estado
              </Label>
              <Select onValueChange={(value) => setStatus(value as Firefighter['status'])} value={status} required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un estado" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s} value={s}>{s === 'Active' ? 'Activo' : 'Inactivo'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
