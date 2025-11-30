
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Service, Firefighter, Vehicle } from '@/lib/types';
import { getServiceById } from '@/services/services.service';
import { getFirefighters } from '@/services/firefighters.service';
import { getVehicles } from '@/services/vehicles.service';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, Users, Truck, Siren, MapPin, Calendar, Clock, Phone, Sparkles, MessageCircle, ShieldQuestion, Code, Globe, Building } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format, formatDistance, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    </div>
);

export default function ServiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [service, setService] = useState<Service | null>(null);
    const [firefighters, setFirefighters] = useState<Map<string, Firefighter>>(new Map());
    const [vehicles, setVehicles] = useState<Map<string, Vehicle>>(new Map());
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchServiceDetails = async () => {
            if (!id) return;
            
            setLoading(true);
            try {
                const [serviceData, firefightersData, vehiclesData] = await Promise.all([
                    getServiceById(id),
                    getFirefighters(),
                    getVehicles()
                ]);

                if (!serviceData) {
                    toast({ title: 'Error', description: 'No se pudo encontrar el servicio.', variant: 'destructive' });
                    router.push('/services');
                    return;
                }

                setService(serviceData);
                setFirefighters(new Map(firefightersData.map(f => [f.id, f])));
                setVehicles(new Map(vehiclesData.map(v => [v.id, v])));

            } catch (error) {
                console.error(error);
                toast({ title: 'Error', description: 'No se pudieron cargar los detalles del servicio.', variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };
        fetchServiceDetails();
    }, [id, router, toast]);

    if (loading) {
        return (
            <div>
                <PageHeader title={<Skeleton className="h-9 w-64" />} description={<Skeleton className="h-5 w-48" />}>
                     <Skeleton className="h-10 w-24" />
                </PageHeader>
                <div className="space-y-8">
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }
    
    if (!service) return null;
    
    const getServiceId = (s: Service) => {
        const year = s.year.toString().slice(-2);
        const manualId = s.manualId.toString().padStart(3, '0');
        return `${s.cuartel}-${year}/${manualId}`;
    };

    const getPersonnelName = (id: string) => {
        const f = firefighters.get(id);
        return f ? `${f.legajo} - ${f.lastName}` : 'Desconocido';
    };

    const getVehicleName = (id: string) => {
        return vehicles.get(id)?.numeroMovil || 'Desconocido';
    };

    const serviceDuration = formatDistance(parseISO(service.startDateTime), parseISO(service.endDateTime), { locale: es });
    
    const onDutyPersonnel = service.onDutyIds?.map(getPersonnelName).join(', ') || 'Ninguno';
    const offDutyPersonnel = service.offDutyIds?.map(getPersonnelName).join(', ') || 'Ninguno';


    return (
        <>
            <PageHeader title={`Servicio: ${getServiceId(service)}`} description={service.address}>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push('/services')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Button>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Detalles del Servicio</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <DetailItem icon={Siren} label="Tipo de Servicio" value={service.serviceType} />
                            <DetailItem icon={Code} label="Código de Servicio" value={service.serviceCode} />
                            <DetailItem icon={Calendar} label="Fecha y Hora de Inicio" value={format(parseISO(service.startDateTime), 'Pp', { locale: es })} />
                            <DetailItem icon={Calendar} label="Fecha y Hora de Fin" value={format(parseISO(service.endDateTime), 'Pp', { locale: es })} />
                             <DetailItem icon={Clock} label="Duración Total" value={serviceDuration} />
                            <DetailItem icon={Building} label="Cuartel" value={service.cuartel} />
                            <DetailItem icon={MapPin} label="Zona" value={service.zone} />
                            <DetailItem icon={Phone} label="Convocatoria" value={service.summonMethods?.join(', ') || 'N/A'} />
                            <DetailItem icon={Globe} label="En Conjunto" value={service.inConjunction ? 'Sí' : 'No'} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Personal Interviniente</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DetailItem icon={User} label="Comando" value={getPersonnelName(service.commandId)} />
                            <DetailItem icon={User} label="Jefe de Servicio" value={getPersonnelName(service.serviceChiefId)} />
                            <DetailItem icon={User} label="Cuartelero" value={getPersonnelName(service.stationOfficerId)} />
                            <Separator />
                            <DetailItem icon={Users} label="Dotación de Servicio" value={onDutyPersonnel} />
                            <DetailItem icon={Users} label="Dotación de Pasiva" value={offDutyPersonnel} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Móviles Intervinientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {service.interveningVehicles && service.interveningVehicles.length > 0 ? (
                                <ul className="space-y-3">
                                    {service.interveningVehicles.map((iv, index) => (
                                        <li key={index} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 border rounded-md">
                                            <div className="flex items-center gap-3 font-medium">
                                                <Truck className="h-5 w-5 text-primary" />
                                                Móvil {getVehicleName(iv.vehicleId)}
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-2 sm:mt-0">
                                                Duración: {formatDistance(parseISO(iv.departureDateTime), parseISO(iv.returnDateTime), { locale: es })}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground">No se registraron móviles para este servicio.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
                
                <div className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Información Adicional</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <DetailItem icon={ShieldQuestion} label="Colaboración" value={service.collaboration || 'Ninguna'} />
                            <DetailItem icon={Sparkles} label="Reconocimiento" value={service.recognition || 'Ninguna'} />
                            <DetailItem icon={MessageCircle} label="Observaciones" value={service.observations || 'Ninguna'} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
