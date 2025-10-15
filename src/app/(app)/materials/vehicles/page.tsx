
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
} from "@/components/ui/carousel"
import placeholderData from '@/app/lib/placeholder-images.json';

export default function MaterialVehiclesPage() {
    const { vehicles } = placeholderData;

    return (
        <>
            <PageHeader
                title="Vista de Móviles"
                description="Vista ilustrativa de los móviles para la localización de bauleras y equipamiento."
            />

            <Carousel className="w-full">
                <CarouselContent>
                    {vehicles.map(vehicle => (
                        <CarouselItem key={vehicle.id}>
                            <div className="p-1">
                                <Card className="overflow-hidden">
                                    <CardHeader className="p-4">
                                        <CardTitle className="font-headline text-xl">{vehicle.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Carousel opts={{ loop: true }}>
                                            <CarouselContent>
                                                {Object.entries(vehicle.images).map(([key, src]) => (
                                                    <CarouselItem key={key}>
                                                        <div className="p-1">
                                                            <Card className="overflow-hidden">
                                                                <CardHeader className="p-2">
                                                                    <CardTitle className="text-base text-center capitalize">{key.replace(/_/g, ' ')}</CardTitle>
                                                                </CardHeader>
                                                                <CardContent className="flex aspect-video items-center justify-center p-0">
                                                                    <Image
                                                                        src={src}
                                                                        alt={`${vehicle.name} - ${key}`}
                                                                        width={600}
                                                                        height={400}
                                                                        className="object-cover"
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
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                 <CarouselPrevious className="ml-12" />
                 <CarouselNext className="mr-12" />
            </Carousel>
        </>
    );
}
