
'use client';

import { useState, useEffect } from 'react';
import { Vehicle, Firefighter, LoggedInUser } from '@/lib/types';
import { getVehicles, updateVehicle } from '@/services/vehicles.service';
import { getFirefighters } from '@/services/firefighters.service';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Loader2, Save, Users } from 'lucide-react';
import { MultiFirefighterSelect } from '@/components/firefighter-select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { usePathname } from 'next/navigation';

export default function MaterialLeadsManager({ actor }: { actor: LoggedInUser }) {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [selectedLeads, setSelectedLeads] = useState<Firefighter[]>([]);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const { getActiveRole } = useAuth();
    const pathname = usePathname();

    const activeRole = getActiveRole(pathname);
    const canEdit = activeRole === 'Master' || activeRole === 'Administrador';

    const fetchData = async () => {
        setLoading(true);
        try {
            const [vData, fData] = await Promise.all([getVehicles(), getFirefighters()]);
            // Solo vehículos operativos o no operativos, ignoramos los dados de baja definitiva
            setVehicles(vData.filter(v => v.status !== 'Fuera de Dotación'));
            setFirefighters(fData.filter(f => f.status === 'Active' || f.status === 'Auxiliar'));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEdit = (vehicle: Vehicle) => {
        if (!canEdit) return;
        setEditingVehicle(vehicle);
        setSelectedLeads(vehicle.materialEncargados || []);
    };

    const handleSave = async () => {
        if (!editingVehicle || !actor || !canEdit) return;
        setSaving(true);
        try {
            await updateVehicle(editingVehicle.id, {
                materialEncargadoIds: selectedLeads.map(f => f.id)
            }, actor);
            toast({ title: "Asignación actualizada", description: `Encargados del Móvil ${editingVehicle.numeroMovil} actualizados.` });
            setEditingVehicle(null);
            fetchData();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>;

    return (
        <Card className="shadow-md border-primary/10">
            <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Gestión de Encargados de Inventario
                </CardTitle>
                <CardDescription>Defina qué integrantes tienen permiso para proponer cambios en el equipamiento de cada móvil.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Unidad</TableHead>
                            <TableHead>Especialidad</TableHead>
                            <TableHead>Encargados Actuales</TableHead>
                            {canEdit && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vehicles.map(v => (
                            <TableRow key={v.id} className="hover:bg-muted/30">
                                <TableCell className="font-bold">Móvil {v.numeroMovil}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{v.especialidad}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {v.materialEncargados && v.materialEncargados.length > 0 ? (
                                            v.materialEncargados.map(e => <Badge key={e.id} variant="secondary" className="text-[10px]">{e.lastName}</Badge>)
                                        ) : (
                                            <span className="text-muted-foreground text-[10px] italic">Sin encargados asignados</span>
                                        )}
                                    </div>
                                </TableCell>
                                {canEdit && (
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleEdit(v)} className="h-8">
                                            <Edit className="h-3.5 w-3.5 mr-2" /> Asignar
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>

            <Dialog open={!!editingVehicle} onOpenChange={(open) => !open && setEditingVehicle(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-headline">Configurar Encargados: Móvil {editingVehicle?.numeroMovil}</DialogTitle>
                        <DialogDescription>Seleccione al personal responsable del inventario técnico de esta unidad.</DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase">Personal Seleccionado</Label>
                            <MultiFirefighterSelect
                                title="integrantes"
                                selected={selectedLeads}
                                onSelectedChange={setSelectedLeads}
                                firefighters={firefighters}
                            />
                        </div>
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                            <p className="text-[10px] text-primary font-medium leading-relaxed">
                                ℹ️ Los integrantes asignados podrán realizar movimientos de equipo, dar de baja materiales o editar fichas técnicas del móvil {editingVehicle?.numeroMovil}. Todas sus acciones quedarán como "Pendientes" hasta que un Administrador o Master las apruebe.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="border-t pt-4">
                        <Button variant="ghost" onClick={() => setEditingVehicle(null)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
