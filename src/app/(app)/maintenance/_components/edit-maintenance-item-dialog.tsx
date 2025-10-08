
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
import { useState, useEffect } from "react";
import { MaintenanceItem } from "@/lib/types";
import { updateMaintenanceItem } from "@/services/maintenance-items.service";

export default function EditMaintenanceItemDialog({ children, item, onItemUpdated }: { children: React.ReactNode; item: MaintenanceItem, onItemUpdated: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(item.name);

  useEffect(() => {
    if (open) {
        setName(item.name);
    }
  }, [open, item]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
        toast({ title: "Error", description: "El nombre del ítem no puede estar vacío.", variant: "destructive" });
        return;
    }
    
    setLoading(true);

    try {
        await updateMaintenanceItem(item.id, { name: name.trim() });
        toast({ title: "¡Éxito!", description: "El ítem de mantenimiento ha sido actualizado." });
        onItemUpdated();
        setOpen(false);
    } catch (error: any) {
        console.error(error);
        toast({ title: "Error", description: error.message || "No se pudo actualizar el ítem.", variant: "destructive" });
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
            <DialogTitle className="font-headline">Editar Ítem del Checklist</DialogTitle>
            <DialogDescription>
              Modifique el nombre del ítem de la lista maestra.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name-edit" className="text-left">Nombre del Ítem</Label>
              <Input id="name-edit" value={name} onChange={e => setName(e.target.value)} required />
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
