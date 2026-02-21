
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useEffect, useState, useMemo } from 'react';
import { getVehicles } from '@/services/vehicles.service';
import { Vehicle } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import vehicleImages from '@/app/lib/placeholder-images.json';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Truck, Info } from 'lucide-react';

export default function MaterialVehiclesPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAndSetVehicles = async () => {
            setLoading(true);
            try {
                const data = await getVehicles();
                setVehicles(data);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los datos de los móviles.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };
        fetchAndSetVehicles();
    }, [toast]);

    const selectedVehicle = useMemo(() => {
        return vehicles.find(v => v.id === selectedVehicleId) || null;
    }, [vehicles, selectedVehicleId]);
    
    if(loading) {
        return (
            <>
                <PageHeader
                    title="Vista de Móviles"
                    description="Cargando flota vehicular..."
                />
                <div className="space-y-8">
                    <Card>
                        <CardHeader><Skeleton className="h-10 w-full" /></CardHeader>
                        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                    </Card>
                </div>
            </>
        )
    }

    return (
        <>
            <PageHeader
                title="Vista de Móviles"
                description="Seleccione un móvil para visualizar la ubicación de sus bauleras y equipamiento."
            />

            <Card className="mb-8 border-primary/20 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Truck className="h-5 w-5 text-primary" />
                        <Label htmlFor="vehicle-select" className="font-headline text-lg">Seleccionar Unidad</Label>
                    </div>
                    <Select value={selectedVehicleId || ''} onValueChange={setSelectedVehicleId}>
                        <SelectTrigger id="vehicle-select" className="h-12 text-lg">
                            <SelectValue placeholder="Elija un móvil de la lista..." />
                        </SelectTrigger>
                        <SelectContent>
                            {vehicles.map(vehicle => (
                                <SelectItem key={vehicle.id} value={vehicle.id} className="text-base py-3">
                                    Móvil {vehicle.numeroMovil} - {vehicle.marca} {vehicle.modelo}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardHeader>
            </Card>

            <div className="space-y-8">
                {selectedVehicle ? (() => {
                    const images = vehicleImages.vehicles.find(v => v.name === selectedVehicle.numeroMovil)?.images || vehicleImages.vehicles.find(v => v.id === "placeholder_vehicle_1")!.images;
                    return (
                        <Card key={selectedVehicle.id} className="overflow-hidden border-2 border-primary/10 shadow-md">
                            <CardHeader className="bg-muted/30">
                                <CardTitle className="font-headline text-2xl text-primary">Móvil {selectedVehicle.numeroMovil}</CardTitle>
                                <CardDescription className="text-base">
                                    {selectedVehicle.marca} {selectedVehicle.modelo} • {selectedVehicle.cuartel} • {selectedVehicle.especialidad}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <Carousel opts={{ loop: true }} className="w-full max-w-4xl mx-auto">
                                    <CarouselContent>
                                        {Object.entries(images).map(([key, src]) => (
                                            <CarouselItem key={key}>
                                                <div className="p-1">
                                                    <Card className="overflow-hidden border-none shadow-none">
                                                         <CardHeader className="p-2">
                                                            <CardTitle className="text-base text-center capitalize text-muted-foreground font-medium">Vista: {key.replace(/_/g, ' ')}</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="flex aspect-video items-center justify-center p-0 bg-slate-100 rounded-lg overflow-hidden border">
                                                            <Image
                                                                src={src}
                                                                alt={`${selectedVehicle.numeroMovil} - ${key}`}
                                                                width={800}
                                                                height={500}
                                                                className="object-contain w-full h-full"
                                                                data-ai-hint="fire truck"
                                                            />
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    <div className="hidden md:block">
                                        <CarouselPrevious className="-left-12" />
                                        <CarouselNext className="-right-12" />
                                    </div>
                                </Carousel>
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-lg border border-dashed">
                                    <div className="flex items-start gap-2">
                                        <Info className="h-4 w-4 text-primary mt-0.5" />
                                        <p><strong>Capacidad:</strong> {selectedVehicle.capacidadAgua > 0 ? `${selectedVehicle.capacidadAgua} Litros` : 'No especificado'}</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Info className="h-4 w-4 text-primary mt-0.5" />
                                        <p><strong>Tracción:</strong> {selectedVehicle.traccion}</p>
                                    </div>
                                    {selectedVehicle.observaciones && (
                                        <div className="flex items-start gap-2 md:col-span-2">
                                            <Info className="h-4 w-4 text-primary mt-0.5" />
                                            <p><strong>Notas:</strong> {selectedVehicle.observaciones}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })() : (
                     <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-muted/10">
                        <Truck className="h-16 w-16 text-muted-foreground/30 mb-4" />
                        <h3 className="text-xl font-semibold text-muted-foreground">Esperando selección</h3>
                        <p className="text-muted-foreground max-w-sm mt-2">
                            Por favor, seleccione una unidad en el menú de arriba para cargar sus vistas y detalles técnicos.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}
