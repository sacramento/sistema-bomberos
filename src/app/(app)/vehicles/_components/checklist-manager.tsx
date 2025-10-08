
'use client';

import { useState, useEffect } from 'react';
import { Vehicle, MaintenanceItem } from '@/lib/types';
import { getMaintenanceItems } from '@/services/maintenance-items.service';
import { updateVehicle } from '@/services/vehicles.service';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

interface ChecklistManagerProps {
    vehicle: Vehicle;
    canEdit: boolean;
    onVehicleUpdated: () => void;
}

export default function ChecklistManager({ vehicle, canEdit, onVehicleUpdated }: ChecklistManagerProps) {
    const [masterItems, setMasterItems] = useState<MaintenanceItem[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set(vehicle.maintenanceItemIds || []));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            try {
                const items = await getMaintenanceItems();
                setMasterItems(items);
            } catch (error) {
                toast({ title: "Error", description: "No se pudo cargar la lista maestra de ítems.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, [toast]);

    useEffect(() => {
        // Reset selected items if the vehicle prop changes
        setSelectedItemIds(new Set(vehicle.maintenanceItemIds || []));
    }, [vehicle]);

    const handleCheckboxChange = (itemId: string, checked: boolean) => {
        setSelectedItemIds(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(itemId);
            } else {
                newSet.delete(itemId);
            }
            return newSet;
        });
    };

    const handleSaveChanges = async () => {
        setSaving(true);
        try {
            const updatedData = { maintenanceItemIds: Array.from(selectedItemIds) };
            await updateVehicle(vehicle.id, updatedData);
            toast({ title: "Éxito", description: "El checklist del móvil ha sido actualizado." });
            onVehicleUpdated(); // Notify parent to re-fetch vehicle data
        } catch (error) {
            toast({ title: "Error", description: "No se pudo guardar el checklist.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Configuración del Checklist</CardTitle>
                <CardDescription>Seleccione los ítems de mantenimiento que aplican a este móvil. Estos ítems aparecerán al registrar un nuevo servicio.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-8 w-2/3" />
                    </div>
                ) : masterItems.length > 0 ? (
                    <ScrollArea className="h-96 w-full rounded-md border p-4">
                        <div className="space-y-4">
                            {masterItems.map(item => (
                                <div key={item.id} className="flex items-center space-x-3">
                                    <Checkbox
                                        id={`item-${item.id}`}
                                        checked={selectedItemIds.has(item.id)}
                                        onCheckedChange={(checked) => handleCheckboxChange(item.id, !!checked)}
                                        disabled={!canEdit}
                                    />
                                    <Label htmlFor={`item-${item.id}`} className="font-normal">{item.name}</Label>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <Alert>
                        <AlertTitle>No hay ítems de mantenimiento</AlertTitle>
                        <AlertDescription>
                            No se encontraron ítems en la lista maestra. Un administrador debe agregarlos en la página de <Link href="/maintenance" className="underline font-semibold">Items</Link> para poder configurar los checklists.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
            {canEdit && masterItems.length > 0 && (
                 <CardFooter>
                    <Button onClick={handleSaveChanges} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                        Guardar Checklist
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
