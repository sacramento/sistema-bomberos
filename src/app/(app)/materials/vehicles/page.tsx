
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

// Define a structure for placeholder images that we can map to real vehicles
const vehicleImagePlaceholders: Record<string, Record<string, string>> = {
    "Móvil 1": {
        "conductor": "https://picsum.photos/seed/v1-conductor/600/400",
        "acompanante": "https://picsum.photos/seed/v1-acompanante/600/400",
        "frente": "https://picsum.photos/seed/v1-frente/600/400",
        "trasero": "https://picsum.photos/seed/v1-trasero/600/400",
        "techo": "https://picsum.photos/seed/v1-techo/600/400"
    },
    "Móvil 2": {
        "conductor": "https://picsum.photos/seed/v2-conductor/600/400",
        "acompanante": "https://picsum.photos/seed/v2-acompanante/600/400",
        "frente": "https://picsum.photos/seed/v2-frente/600/400",
        "trasero": "https://picsum.photos/seed/v2-trasero/600/400",
        "techo": "https://picsum.photos/seed/v2-techo/600/400"
    },
    "Móvil 3": {
        "conductor": "https://picsum.photos/seed/v3-conductor/600/400",
        "acompanante": "https://picsum.photos/seed/v3-acompanante/600/400",
        "frente": "https://picsum.photos/seed/v3-frente/600/400",
        "trasero": "https://picsum.photos/seed/v3-trasero/600/400",
        "techo": "https://picsum.photos/seed/v3-techo/600/400"
    }
};

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
                    const images = vehicleImagePlaceholders[vehicle.numeroMovil] || vehicleImagePlaceholders['Móvil 1'];
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
                                    <CarouselPrevious className="ml-16" />
                                    <CarouselNext className="mr-16" />
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

