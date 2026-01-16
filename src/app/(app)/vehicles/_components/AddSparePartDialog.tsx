
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { addSparePart } from "@/services/spare-parts.service";
import { Loader2 } from "lucide-react";
import { LoggedInUser } from "@/lib/types";

interface AddSparePartDialogProps {
    children: React.ReactNode;
    vehicleId: string;
    onPartAdded: () => void;
    actor: LoggedInUser;
}

export default function AddSparePartDialog({ children, vehicleId, onPartAdded, actor }: AddSparePartDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [code, setCode] = useState('');
    const [observations, setObservations] = useState('');

    const resetForm = () => {
        setName('');
        setBrand('');
        setCode('');
        setObservations('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            toast({ variant: "destructive", title: "Campo requerido", description: "El nombre del repuesto es obligatorio." });
            return;
        }

        setLoading(true);
        try {
            await addSparePart({ vehicleId, name, brand, code, observations }, actor);
            toast({ title: "¡Éxito!", description: "El repuesto ha sido agregado." });
            onPartAdded();
            resetForm();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al agregar", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if(!isOpen) resetForm(); setOpen(isOpen); }}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-headline">Agregar Nuevo Repuesto</DialogTitle>
                    <DialogDescription>Complete los detalles del repuesto para este móvil.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre del Repuesto</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="brand">Marca (Opcional)</Label>
                            <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="code">Código/N° de Parte (Opcional)</Label>
                            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="observations">Observaciones (Opcional)</Label>
                        <Textarea id="observations" value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Ej: dónde comprar, especificaciones, etc."/>
                    </div>
                </form>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={loading}>{loading ? <Loader2 className="animate-spin mr-2"/> : null} {loading ? "Guardando..." : "Guardar Repuesto"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
