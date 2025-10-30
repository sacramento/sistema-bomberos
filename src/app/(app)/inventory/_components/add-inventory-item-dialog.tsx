
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { GeneralInventoryItem } from "@/lib/types";
import { addGeneralInventoryItem } from "@/services/general-inventory.service";
import { Textarea } from "@/components/ui/textarea";

const itemTypes: GeneralInventoryItem['tipo'][] = ['Moviliario', 'electronica', 'herramientas'];
const cuarteles: GeneralInventoryItem['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3', 'Comision'];
const ubicaciones: GeneralInventoryItem['ubicacion'][] = ['Baño', 'Matera', 'Cocina', 'Roperia', 'Cadetes', 'Deposito', 'Jefatura', 'Cambiaderos', 'Patio', 'Playón', 'Guardia'];
const estados: GeneralInventoryItem['estado'][] = ['En Servicio', 'Fuera de Servicio'];
const condiciones: GeneralInventoryItem['condicion'][] = ['Bueno', 'Regular', 'Malo'];

export default function AddInventoryItemDialog({ children, onItemAdded }: { children: React.ReactNode, onItemAdded: () => void }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Form state
    const [codigo, setCodigo] = useState('');
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState<GeneralInventoryItem['tipo'] | ''>('');
    const [caracteristicas, setCaracteristicas] = useState('');
    const [estado, setEstado] = useState<GeneralInventoryItem['estado']>('En Servicio');
    const [condicion, setCondicion] = useState<GeneralInventoryItem['condicion']>('Bueno');
    const [cuartel, setCuartel] = useState<GeneralInventoryItem['cuartel'] | ''>('');
    const [ubicacion, setUbicacion] = useState<GeneralInventoryItem['ubicacion'] | ''>('');

    const resetForm = () => {
        setCodigo(''); setNombre(''); setTipo(''); setCaracteristicas(''); setEstado('En Servicio');
        setCondicion('Bueno'); setCuartel(''); setUbicacion('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!codigo || !nombre || !tipo || !estado || !condicion || !cuartel || !ubicacion) {
            toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor, complete todos los campos requeridos." });
            return;
        }

        setLoading(true);
        try {
            await addGeneralInventoryItem({ codigo, nombre, tipo, caracteristicas, estado, condicion, cuartel, ubicacion });
            toast({ title: "¡Éxito!", description: "El ítem ha sido agregado al inventario." });
            onItemAdded();
            resetForm();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al agregar", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline">Agregar Ítem al Inventario General</DialogTitle>
                    <DialogDescription>Complete los detalles del nuevo ítem.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4 space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="codigo">Código (Único)</Label><Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="nombre">Nombre</Label><Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required /></div>
                        <div className="space-y-2"><Label>Tipo</Label><Select value={tipo} onValueChange={(v) => setTipo(v as any)}><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent>{itemTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Cuartel/Comisión</Label><Select value={cuartel} onValueChange={(v) => setCuartel(v as any)}><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent>{cuarteles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Ubicación</Label><Select value={ubicacion} onValueChange={(v) => setUbicacion(v as any)}><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent>{ubicaciones.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Estado</Label><Select value={estado} onValueChange={(v) => setEstado(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{estados.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2 col-span-full"><Label>Condición</Label><Select value={condicion} onValueChange={(v) => setCondicion(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{condiciones.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2 col-span-full">
                            <Label htmlFor="caracteristicas">Características</Label>
                            <Textarea id="caracteristicas" value={caracteristicas} onChange={(e) => setCaracteristicas(e.target.value)} placeholder="Modelo, N/S, etc." />
                        </div>
                    </div>
                </form>
                <DialogFooter className="border-t pt-4"><Button onClick={handleSubmit} disabled={loading}>{loading ? "Guardando..." : "Guardar Ítem"}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
