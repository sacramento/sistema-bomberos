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
import { firefighters } from "@/lib/data";
import { useState } from "react";

const specializations = ['General', 'MatPel', 'Médica', 'Rescate'];

export default function AddClassDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Logic to add class would go here
    toast({
        title: "¡Éxito!",
        description: "La nueva clase ha sido creada.",
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Crear Nueva Clase</DialogTitle>
            <DialogDescription>
              Complete los detalles de la nueva clase de capacitación.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" placeholder="Ej: RCP y Primeros Auxilios" />
            </div>
             <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" placeholder="Describa brevemente la clase..." />
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input id="date" type="date" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="time">Hora de Inicio</Label>
                    <Input id="time" type="time" />
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialization">Especialidad</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una especialidad" />
                </SelectTrigger>
                <SelectContent>
                  {specializations.map(spec => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label htmlFor="instructor">Instructor</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un instructor" />
                </SelectTrigger>
                <SelectContent>
                  {firefighters.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Guardar Clase</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
