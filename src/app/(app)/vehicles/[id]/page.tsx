'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Vehicle } from "@/lib/types";
import { getVehicleById } from "@/services/vehicles.service";
import { useToast } from "@/hooks/use-toast";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Edit, Trash2, Gauge, Calendar, Droplets, MapPin, Wrench, Shield, Truck, UserCircle, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import EditVehicleDialog from "../_components/edit-vehicle-dialog";
import { useAuth } from "@/context/auth-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteVehicle } from "@/services/vehicles.service";

interface DetailItemProps {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
}

const DetailItem: React.FC<DetailItemProps> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-4">
    <Icon className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
    <div className="flex flex-col">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  </div>
);

export default function VehicleDetailPage() {
    const params = useParams();
    const router = useRouter();
    const vehicleId = params.id as string;
    const { toast } = useToast();

    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    
    const { user, getActiveRole } = useAuth();
    const activeRole = getActiveRole(`/vehicles/${vehicleId}`);
    
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);
    const canEdit = useMemo(() => {
      if (canManage) return true;
      if (activeRole === 'Encargado Móvil' && user?.id === vehicle?.encargadoId) return true;
      return false;
    }, [canManage, activeRole, user, vehicle]);

    const fetchVehicle = async () => {
        if (vehicleId) {
            setLoading(true);
            try {
                const data = await getVehicleById(vehicleId);
                if (data) {
                    setVehicle(data);
                } else {
                    toast({ title: "Error", description: "No se encontró el móvil solicitado.", variant: "destructive" });
                    router.push('/vehicles');
                }
            } catch (error) {
                console.error(error);
                toast({ title: "Error", description: "No se pudo cargar la información del móvil.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchVehicle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vehicleId]);

     const handleDelete = async () => {
        if (!vehicle) return;
        try {
            await deleteVehicle(vehicle.id);
            toast({ title: "Éxito", description: "El móvil ha sido eliminado." });
            router.push('/vehicles');
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo eliminar el móvil.", variant: "destructive" });
        }
    };


    if (loading) {
        return (
            <>
                <PageHeader title={<Skeleton className="h-9 w-64" />} description={<Skeleton className="h-5 w-48" />}>
                     <Skeleton className="h-10 w-24" />
                </PageHeader>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-40" />
                        <Skeleton className="h-4 w-52" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-48 w-full" />
                         <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </>
        )
    }

    if (!vehicle) return null;

    return (
        <>
            <PageHeader title={`Móvil ${vehicle.numeroMovil}`} description={`${vehicle.marca} ${vehicle.modelo}`}>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push('/vehicles')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Listado
                    </Button>
                    {canEdit && (
                        <EditVehicleDialog vehicle={vehicle} onVehicleUpdated={fetchVehicle}>
                           <Button><Edit className="mr-2 h-4 w-4" />Editar</Button>
                        </EditVehicleDialog>
                    )}
                </div>
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Ficha Técnica Completa</CardTitle>
                    <CardDescription>Detalles técnicos y administrativos del vehículo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                        <DetailItem icon={Gauge} label="Kilometraje" value={`${vehicle.kilometraje.toLocaleString('es-AR')} km`} />
                        <DetailItem icon={Calendar} label="Año" value={vehicle.ano} />
                        <DetailItem icon={MapPin} label="Cuartel" value={<Badge variant="secondary">{vehicle.cuartel}</Badge>} />
                        <DetailItem icon={Wrench} label="Tracción" value={vehicle.traccion} />
                        <DetailItem icon={Shield} label="Especialidad" value={vehicle.especialidad} />
                        <DetailItem icon={Truck} label="Tipo de Vehículo" value={vehicle.tipoVehiculo} />
                        <DetailItem icon={Droplets} label="Capacidad de Agua" value={vehicle.capacidadAgua > 0 ? `${vehicle.capacidadAgua.toLocaleString('es-AR')} L` : 'No aplica'} />
                        <DetailItem icon={UserCircle} label="Encargado" value={vehicle.encargado ? `${vehicle.encargado.firstName} ${vehicle.encargado.lastName}` : 'Sin Asignar'} />
                    </div>
                     <Separator className="my-6" />
                     <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-muted-foreground"/>Observaciones</h4>
                        <p className="text-muted-foreground text-sm whitespace-pre-wrap">{vehicle.observaciones || 'No hay observaciones registradas.'}</p>
                     </div>
                      {canManage && (
                         <>
                            <Separator className="my-6" />
                            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                                <h4 className="font-bold text-destructive mb-2">Zona Peligrosa</h4>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar Móvil
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción es irreversible. Se eliminará permanentemente la ficha del móvil <span className="font-semibold">{vehicle.numeroMovil}</span>.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                                Sí, eliminar móvil
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
