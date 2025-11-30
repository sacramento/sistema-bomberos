
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowRight, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import AddServiceDialog from "./_components/add-service-dialog";
import { useEffect, useState, useMemo } from "react";
import { Service } from "@/lib/types";
import { getServices, deleteService } from "@/services/services.service";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import EditServiceDialog from "./_components/edit-service-dialog";

export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { getActiveRole } = useAuth();
    const pathname = usePathname();

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

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

    const handleDataChange = () => {
        fetchServices();
    }
    
    const getServiceId = (service: Service) => {
        if (!service.cuartel || !service.year || !service.manualId) return 'ID Inválido';
        const year = service.year.toString().slice(-2);
        const manualId = service.manualId.toString().padStart(3, '0');
        return `${service.cuartel}-${year}/${manualId}`;
    }
    
    const handleDelete = async (service: Service) => {
        if (!service) return;
        try {
            await deleteService(service.id);
            toast({
                title: "Servicio Eliminado",
                description: `El servicio ${getServiceId(service)} ha sido eliminado correctamente.`,
            });
            fetchServices();
        } catch (error: any) {
            toast({
                title: "Error al eliminar",
                description: error.message || "No se pudo eliminar el servicio.",
                variant: "destructive",
            });
        }
    };

    const getTotalPersonnel = (service: Service) => {
        const onDutyCount = service.onDutyIds?.length || 0;
        const offDutyCount = service.offDutyIds?.length || 0;
        const commandExists = service.commandId ? 1 : 0;
        const chiefExists = service.serviceChiefId ? 1 : 0;
        const stationOfficerExists = service.stationOfficerId ? 1 : 0;

        const uniqueIds = new Set([service.commandId, service.serviceChiefId, service.stationOfficerId].filter(Boolean));
        
        return uniqueIds.size + onDutyCount + offDutyCount;
    }

    return (
        <>
            <PageHeader title="Registro de Servicios" description="Gestione todas las intervenciones y servicios del departamento.">
                 {canManage && (
                    <AddServiceDialog onServiceAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Registrar Servicio
                        </Button>
                    </AddServiceDialog>
                 )}
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
                                <AlertDialog key={service.id}>
                                    <Card>
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <Badge variant="secondary" className="mb-2">{service.serviceType || 'Sin Tipo'}</Badge>
                                                    <CardTitle className="text-lg">{getServiceId(service)}</CardTitle>
                                                    <CardDescription>{service.address}</CardDescription>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                     <Button asChild variant="outline" size="sm">
                                                        <Link href={`/services/${service.id}`}>
                                                            Ver Detalle <ArrowRight className="ml-2 h-4 w-4"/>
                                                        </Link>
                                                    </Button>
                                                    {canManage && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                <EditServiceDialog service={service} onServiceUpdated={handleDataChange}>
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                                                    </DropdownMenuItem>
                                                                </EditServiceDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                                    </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardFooter className="text-xs text-muted-foreground">
                                            {`Fecha: ${service.date} | Personal: ${getTotalPersonnel(service)}`}
                                        </CardFooter>
                                    </Card>
                                     <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Está seguro que desea eliminar este servicio?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción no se puede deshacer. Se eliminará permanentemente el registro del servicio <span className="font-semibold">{getServiceId(service)}</span>.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(service)} variant="destructive">
                                                Eliminar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
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
