
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
import { useEffect, useState } from 'react';
import { getVehicles } from '@/services/vehicles.service';
import { Vehicle } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import vehicleImages from '@/app/lib/placeholder-images.json';

export default function MaterialVehiclesPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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
    
    if(loading) {
        return (
            <>
                <PageHeader
                    title="Vista de Móviles"
                    description="Cargando información ilustrativa de los móviles..."
                />
                <div className="space-y-8">
                     {Array.from({ length: 2 }).map((_, index) => (
                        <Card key={index}>
                            <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                            <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                        </Card>
                     ))}
                </div>
            </>
        )
    }

    return (
        <>
            <PageHeader
                title="Vista de Móviles"
                description="Vista ilustrativa de los móviles para la localización de bauleras y equipamiento."
            />

            <div className="space-y-8">
                {vehicles.length > 0 ? vehicles.map(vehicle => {
                    const images = vehicleImages.vehicles.find(v => v.name === vehicle.numeroMovil)?.images || vehicleImages.vehicles.find(v => v.id === "placeholder_vehicle_1")!.images;
                    return (
                        <Card key={vehicle.id} className="overflow-hidden">
                            <CardHeader>
                                <CardTitle className="font-headline text-xl">{vehicle.numeroMovil}</CardTitle>
                                <CardDescription>{vehicle.marca} {vehicle.modelo}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Carousel opts={{ loop: true }} className="w-full max-w-4xl mx-auto">
                                    <CarouselContent>
                                        {Object.entries(images).map(([key, src]) => (
                                            <CarouselItem key={key}>
                                                <div className="p-1">
                                                    <Card className="overflow-hidden">
                                                         <CardHeader className="p-2">
                                                            <CardTitle className="text-base text-center capitalize">{key.replace(/_/g, ' ')}</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="flex aspect-video items-center justify-center p-0 bg-secondary">
                                                            <Image
                                                                src={src}
                                                                alt={`${vehicle.numeroMovil} - ${key}`}
                                                                width={600}
                                                                height={400}
                                                                className="object-contain"
                                                                data-ai-hint="fire truck"
                                                            />
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    <CarouselPrevious />
                                    <CarouselNext />
                                </Carousel>
                            </CardContent>
                        </Card>
                    )
                }) : (
                     <Card>
                        <CardContent className="p-10 text-center text-muted-foreground">
                            No hay móviles registrados para mostrar.
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}
