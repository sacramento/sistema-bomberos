
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { SparePart, LoggedInUser } from "@/lib/types";
import { updateSparePart } from "@/services/spare-parts.service";
import { Loader2 } from "lucide-react";

interface EditSparePartDialogProps {
    children: React.ReactNode;
    part: SparePart;
    onPartUpdated: () => void;
    actor: LoggedInUser;
}

export default function EditSparePartDialog({ children, part, onPartUpdated, actor }: EditSparePartDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [code, setCode] = useState('');
    const [observations, setObservations] = useState('');
    
    useEffect(() => {
        if(open) {
            setName(part.name);
            setBrand(part.brand || '');
            setCode(part.code || '');
            setObservations(part.observations || '');
        }
    }, [open, part]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            toast({ variant: "destructive", title: "Campo requerido", description: "El tipo de repuesto es obligatorio." });
            return;
        }

        setLoading(true);
        try {
            await updateSparePart(part.id, { name, brand, code, observations }, actor);
            toast({ title: "¡Éxito!", description: "El repuesto ha sido actualizado." });
            onPartUpdated();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al actualizar", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-headline">Editar Repuesto</DialogTitle>
                    <DialogDescription>Modifique los detalles del repuesto.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name-edit">Tipo</Label>
                        <Input id="name-edit" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="brand-edit">Marca (Opcional)</Label>
                            <Input id="brand-edit" value={brand} onChange={(e) => setBrand(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="code-edit">Código/N° de Parte (Opcional)</Label>
                            <Input id="code-edit" value={code} onChange={(e) => setCode(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="observations-edit">Observaciones (Opcional)</Label>
                        <Textarea id="observations-edit" value={observations} onChange={(e) => setObservations(e.target.value)} />
                    </div>
                </form>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={loading}>{loading ? <Loader2 className="animate-spin mr-2"/> : null} {loading ? "Guardando..." : "Guardar Cambios"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
