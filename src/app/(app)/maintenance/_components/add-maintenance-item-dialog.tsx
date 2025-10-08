
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
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { addMaintenanceItem } from "@/services/maintenance-items.service";

export default function AddMaintenanceItemDialog({ children, onItemAdded }: { children: React.ReactNode; onItemAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');

  const resetForm = () => {
    setName('');
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
        toast({ title: "Error", description: "El nombre del ítem no puede estar vacío.", variant: "destructive" });
        return;
    }
    
    setLoading(true);

    try {
        await addMaintenanceItem({ name: name.trim() });
        toast({ title: "¡Éxito!", description: "El nuevo ítem de mantenimiento ha sido agregado." });
        onItemAdded();
        resetForm();
        setOpen(false);
    } catch (error: any) {
        console.error(error);
        toast({ title: "Error", description: error.message || "No se pudo agregar el ítem.", variant: "destructive" });
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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Agregar Ítem al Checklist</DialogTitle>
            <DialogDescription>
              Ingrese el nombre para un nuevo ítem en la lista maestra de mantenimiento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-left">Nombre del Ítem</Label>
              <Input id="name" placeholder="Ej: Cambio de aceite y filtro" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Ítem'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
