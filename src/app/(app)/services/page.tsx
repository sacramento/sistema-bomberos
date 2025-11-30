
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import AddServiceDialog from "./_components/add-service-dialog";
import { useEffect, useState } from "react";
import { Service } from "@/lib/types";
import { getServices } from "@/services/services.service";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchServices = async () => {
        setLoading(true);
        try {
            const data = await getServices();
            setServices(data);
        } catch (error) {
            toast({
                title: "Error al cargar servicios",
                description: "No se pudieron obtener los registros de servicios.",
                variant: "destructive"
            });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const handleServiceAdded = () => {
        fetchServices();
    }
    
    const getServiceId = (service: Service) => {
        if (!service.cuartel || !service.year || !service.manualId) return 'ID Inválido';
        const year = service.year.toString().slice(-2);
        const manualId = service.manualId.toString().padStart(3, '0');
        return `${service.cuartel}-${year}/${manualId}`;
    }

    const getTotalPersonnel = (service: Service) => {
        const onDutyCount = service.onDutyIds?.length || 0;
        const offDutyCount = service.offDutyIds?.length || 0;
        const commandExists = service.commandId ? 1 : 0;
        const chiefExists = service.serviceChiefId ? 1 : 0;
        // Avoid double counting if command is also chief
        const uniqueChiefs = commandExists && chiefExists && service.commandId === service.serviceChiefId ? 0 : chiefExists;
        return commandExists + uniqueChiefs + onDutyCount + offDutyCount;
    }

    return (
        <>
            <PageHeader title="Registro de Servicios" description="Gestione todas las intervenciones y servicios del departamento.">
                <AddServiceDialog onServiceAdded={handleServiceAdded}>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Registrar Servicio
                    </Button>
                </AddServiceDialog>
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Servicios Recientes</CardTitle>
                    <CardDescription>Listado de los últimos servicios registrados, del más reciente al más antiguo.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                        </div>
                    ) : services.length > 0 ? (
                        <div className="space-y-4">
                           {services.map(service => (
                                <Card key={service.id}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <Badge variant="secondary" className="mb-2">{service.serviceType || 'Sin Tipo'}</Badge>
                                                <CardTitle className="text-lg">{getServiceId(service)}</CardTitle>
                                                <CardDescription>{service.address}</CardDescription>
                                            </div>
                                             <Button asChild variant="outline" size="sm">
                                                <Link href={`/services/${service.id}`}>
                                                    Ver Detalle <ArrowRight className="ml-2 h-4 w-4"/>
                                                </Link>
                                            </Button>
                                        </div>
                                    </CardHeader>
                                     <CardFooter className="text-xs text-muted-foreground">
                                        {`Fecha: ${service.date} | Personal: ${getTotalPersonnel(service)}`}
                                    </CardFooter>
                                </Card>
                           ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">Aún no hay servicios registrados.</p>
                            <p className="text-sm text-muted-foreground mt-2">Haga clic en "Registrar Servicio" para empezar.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
