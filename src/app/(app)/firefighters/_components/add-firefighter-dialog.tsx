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
import { useState } from "react";
import { firefighters } from "@/lib/data";

const ranks = [
    'ASPIRANTE',
    'BOMBERO',
    'CABO',
    'CABO PRIMERO',
    'SARGENTO',
    'SARGENTO PRIMERO',
    'SUBOFICIAL PRINCIPAL',
    'SUBOFICIAL MAYOR',
    'OFICIAL AYUDANTE',
    'OFICIAL INSPECTOR',
    'OFICIAL PRINCIPAL',
    'SUBCOMANDANTE',
    'COMANDANTE',
    'COMANDANTE MAYOR',
    'COMANDANTE GENERAL'
];

// Get unique firehouses from data
const firehouses = [...new Set(firefighters.map(f => f.firehouse))];

export default function AddFirefighterDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Logic to add firefighter would go here
    toast({
        title: "¡Éxito!",
        description: "El nuevo bombero ha sido agregado a la lista.",
    });
    setOpen(false);
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
                Número de ID
              </Label>
              <Input id="id" defaultValue={`FG-00${Math.floor(Math.random()*100)}`} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">
                Nombre
              </Label>
              <Input id="firstName" placeholder="e.g. Juan" className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastName" className="text-right">
                Apellido
              </Label>
              <Input id="lastName" placeholder="e.g. Pérez" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rank" className="text-right">
                Rango
              </Label>
              <Select>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un rango" />
                </SelectTrigger>
                <SelectContent>
                  {ranks.map(rank => (
                    <SelectItem key={rank} value={rank.toLowerCase().replace(/ /g, '-')}>{rank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firehouse" className="text-right">
                Cuartel
              </Label>
              <Select>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un cuartel" />
                </SelectTrigger>
                <SelectContent>
                  {firehouses.map(house => (
                    <SelectItem key={house} value={house}>{house}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Guardar Bombero</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
