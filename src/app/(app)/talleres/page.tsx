
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, ArrowRight, MoreVertical, Edit, Trash2, Search, CalendarClock, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import AddWorkshopDialog from './_components/add-workshop-dialog';
import { useState, useMemo, useEffect } from 'react';
import { Session } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getWorkshops, deleteWorkshop } from '@/services/workshops.service';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import EditWorkshopDialog from './_components/edit-workshop-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseISO, format } from 'date-fns';
import { usePathname } from 'next/navigation';
import { es } from 'date-fns/locale';


const specializations: Session['specialization'][] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'VARIOS'];

const hierarchyOptions = [
    { value: 'bomberos', label: 'Bomberos' },
    { value: 'suboficiales_oficiales', label: 'Suboficiales y Oficiales' },
    { value: 'aspirantes', label: 'Aspirantes' }
];

export default function TalleresPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { getActiveRole } = useAuth();
  const pathname = usePathname();
  const { toast } = useToast();
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialization, setFilterSpecialization] = useState('all');
  const [filterStation, setFilterStation] = useState('all');
  const [filterHierarchy, setFilterHierarchy] = useState('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());

  const activeRole = getActiveRole(pathname);
  const canManageWorkshops = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Instructor', [activeRole]);


  const fetchWorkshops = async () => {
    setLoading(true);
    try {
        const data = await getWorkshops();
        setSessions(data);
    } catch(error) {
         toast({
            title: "Error",
            description: "No se pudieron cargar los talleres.",
            variant: "destructive"
        })
    } finally {
        setLoading(false);
    }
  }
  
  useEffect(() => {
    fetchWorkshops();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const handleDataChange = () => {
    fetchWorkshops();
  };

  const handleDeleteWorkshop = async (sessionId: string) => {
    try {
        await deleteWorkshop(sessionId, { id: 'admin', name: 'Admin', role: 'Master', roles: { asistencia: 'Administrador', semanas: 'Administrador', movilidad: 'Administrador', materiales: 'Administrador', ayudantia: 'Administrador', roperia: 'Administrador', servicios: 'Administrador' } });
        toast({
            title: "Éxito",
            description: "El taller ha sido eliminado."
        });
        fetchWorkshops();
    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message || "No se pudo eliminar el taller.",
            variant: "destructive"
        });
    }
  };
  
 const getCardBorderColor = (session: Session): string => {
    const attendees = session.attendees;
    if (!attendees || attendees.length === 0) return 'border-gray-500';

    const totalAttendees = attendees.length;
    const suboficialRanks = ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR'];
    const oficialRanks = ['OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'];

    // Prioridad 1: Aspirantes
    const aspirantesCount = attendees.filter(a => a.rank === 'ASPIRANTE').length;
    if (aspirantesCount / totalAttendees > 0.8) return 'border-green-500';

    // Prioridad 2: Jerarquía de Oficiales
    const suboficialesOficialesCount = attendees.filter(a => [...suboficialRanks, ...oficialRanks].includes(a.rank)).length;
    if (suboficialesOficialesCount / totalAttendees > 0.8) return 'border-red-500';
    
    // Prioridad 3: Clase General (contiene al menos uno de cada cuartel)
    const firehouseCounts: Record<string, number> = { 'Cuartel 1': 0, 'Cuartel 2': 0, 'Cuartel 3': 0 };
    attendees.forEach(a => {
        if (firehouseCounts.hasOwnProperty(a.firehouse)) {
            firehouseCounts[a.firehouse]++;
        }
    });
    const hasC1 = firehouseCounts['Cuartel 1'] > 0;
    const hasC2 = firehouseCounts['Cuartel 2'] > 0;
    const hasC3 = firehouseCounts['Cuartel 3'] > 0;

    if (hasC1 && hasC2 && hasC3) return 'border-gray-500';

    // Prioridad 4: Mayoría de Cuartel
    if (firehouseCounts['Cuartel 1'] / totalAttendees > 0.6) return 'border-yellow-500';
    if (firehouseCounts['Cuartel 2'] / totalAttendees > 0.6) return 'border-blue-500';
    if (firehouseCounts['Cuartel 3'] / totalAttendees > 0.6) return 'border-orange-500';
    
    // Último Recurso
    return 'border-gray-500';
  };

  const availableYears = useMemo(() => {
    const years = new Set(sessions.map(s => parseISO(s.date).getFullYear().toString()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [sessions]);


  const { upcomingOrCurrentSessions, pastSessions } = useMemo(() => {
    const filtered = sessions.filter(session => {
        if (searchTerm && !session.title.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        if (filterSpecialization !== 'all' && session.specialization !== filterSpecialization) {
            return false;
        }
        if (filterYear !== 'all') {
            const sessionDate = parseISO(session.date);
            const sessionYear = sessionDate.getFullYear().toString();
            if(sessionYear !== filterYear) return false;
        }

        const attendees = session.attendees;
        if (!attendees || attendees.length === 0) {
            return filterStation === 'all' && filterHierarchy === 'all';
        }
        
        if (filterStation !== 'all') {
            const stationCounts: Record<string, number> = {};
            attendees.forEach(a => {
                stationCounts[a.firehouse] = (stationCounts[a.firehouse] || 0) + 1;
            });
            const majorityStation = Object.keys(stationCounts).reduce((a, b) => stationCounts[a] > stationCounts[b] ? a : b, '');
            if (majorityStation !== filterStation || (stationCounts[majorityStation] / attendees.length) <= 0.5) {
                return false;
            }
        }
        
        if (filterHierarchy !== 'all') {
            const totalAttendees = attendees.length;
            const suboficialRanks = ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR'];
            const oficialRanks = ['OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'];

            let count = 0;
            if (filterHierarchy === 'bomberos') {
                count = attendees.filter(a => a.rank === 'BOMBERO' || a.rank === 'ADAPTACION').length;
            } else if (filterHierarchy === 'suboficiales_oficiales') {
                count = attendees.filter(a => [...suboficialRanks, ...oficialRanks].includes(a.rank)).length;
            } else if (filterHierarchy === 'aspirantes') {
                count = attendees.filter(a => a.rank === 'ASPIRANTE').length;
            }
            if (count / totalAttendees <= 0.5) return false;
        }

        return true;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingOrCurrent: Session[] = [];
    const past: Session[] = [];

    filtered.forEach(session => {
        const sessionDate = parseISO(session.date);
        if (sessionDate >= today) {
            upcomingOrCurrent.push(session);
        } else {
            past.push(session);
        }
    });

    return { upcomingOrCurrentSessions: upcomingOrCurrent, pastSessions: past };
  }, [sessions, searchTerm, filterSpecialization, filterStation, filterHierarchy, filterYear]);


  const renderSessionCards = (sessionList: Session[]) => {
      if (loading) {
        return (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-2 flex-grow">
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-8 w-8" />
                  </div>
                  <Skeleton className="h-7 w-4/5 pt-2" />
                </CardHeader>
                <CardContent className="flex-grow">
                  <Skeleton className="h-5 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        );
      }
      
      if (sessionList.length === 0) {
          return (
              <div className="text-center text-muted-foreground py-16">
                  <p>No se encontraron talleres con los filtros aplicados.</p>
              </div>
          );
      }
      
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sessionList.map((session) => {
            const sessionDate = parseISO(session.date);
            const formattedDate = format(sessionDate, "dd 'de' MMMM", { locale: es });

            return (
            <Card key={session.id} className={cn("flex flex-col border-l-4", getCardBorderColor(session))}>
               <CardHeader className="p-4 flex-grow">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2 flex-grow">
                    <Badge variant="secondary" className="w-fit">{session.specialization}</Badge>
                    <p className="text-sm text-muted-foreground">{formattedDate} @ {session.startTime}</p>
                  </div>
                  {canManageWorkshops && (
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <EditWorkshopDialog session={session} onWorkshopUpdated={handleDataChange}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          </EditWorkshopDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                          <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará permanentemente el taller
                              y sus datos asociados.
                          </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteWorkshop(session.id)} variant="destructive">
                              Eliminar
                          </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <CardTitle className="font-headline text-lg md:text-xl pt-2">{session.title}</CardTitle>
                 {session.description && (
                    <CardDescription className="pt-2 hidden md:block">{session.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-0 text-sm">
                  <div className="font-medium">Instructores: <span className="font-normal text-muted-foreground">{session.instructors.map(i => `${i.firstName} ${i.lastName}`).join(', ')}</span></div>
                  {session.assistants && session.assistants.length > 0 && (
                      <div className="font-medium hidden md:block mt-2">Ayudantes: <span className="font-normal text-muted-foreground">{session.assistants.map(a => `${a.firstName} ${a.lastName}`).join(', ')}</span></div>
                  )}
              </CardContent>
              <CardFooter className="p-4 pt-0 mt-auto">
                   <Button asChild className="w-full">
                      <Link href={`/talleres/${session.id}/attendance`}>
                          Gestionar Asistencia
                          <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                  </Button>
              </CardFooter>
            </Card>
          )})}
        </div>
      );
  }

  return (
    <>
      <PageHeader title="Talleres de Capacitación" description="Cree, gestione y filtre talleres de capacitación.">
        {canManageWorkshops && (
          <AddWorkshopDialog onWorkshopAdded={handleDataChange}>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Taller
            </Button>
          </AddWorkshopDialog>
        )}
      </PageHeader>
      
      <Card className="mb-8">
          <CardHeader>
              <CardTitle className="font-headline">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor='search'>Buscar por Título</Label>
                      <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                              id="search"
                              placeholder="Buscar por título..."
                              className="pl-9"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                          />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label>Año Lectivo</Label>
                      <Select value={filterYear} onValueChange={setFilterYear}>
                          <SelectTrigger>
                              <SelectValue placeholder="Seleccionar año" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todos los Años</SelectItem>
                              {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label>Especialidad</Label>
                      <Select value={filterSpecialization} onValueChange={setFilterSpecialization}>
                          <SelectTrigger>
                              <SelectValue placeholder="Todas las especialidades" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todas las especialidades</SelectItem>
                              {specializations.map(spec => <SelectItem key={spec} value={spec}>{spec}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                   <div className="space-y-2">
                       <Label>Cuartel</Label>
                        <Select value={filterStation} onValueChange={setFilterStation}>
                            <SelectTrigger>
                                <SelectValue placeholder="Todos los cuarteles" />
                            </SelectTrigger>
                            <SelectContent>
                               <SelectItem value="all">Todos los Cuarteles</SelectItem>
                               <SelectItem value="Cuartel 1">Cuartel 1</SelectItem>
                               <SelectItem value="Cuartel 2">Cuartel 2</SelectItem>
                               <SelectItem value="Cuartel 3">Cuartel 3</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Jerarquía</Label>
                         <Select value={filterHierarchy} onValueChange={setFilterHierarchy}>
                            <SelectTrigger>
                                <SelectValue placeholder="Todas las jerarquías" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="aspirantes">Solo Aspirantes</SelectItem>
                                <SelectItem value="bomberos">Solo Bomberos</SelectItem>
                                <SelectItem value="suboficiales_oficiales">Suboficiales y Oficiales</SelectItem>
                            </SelectContent>
                         </Select>
                    </div>
              </div>
          </CardContent>
      </Card>
      
        <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-4">
                <TabsTrigger value="current"><CalendarClock className="mr-2 h-4 w-4"/>Actuales y Próximos</TabsTrigger>
                <TabsTrigger value="past"><History className="mr-2 h-4 w-4"/>Pasados</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current">
                {renderSessionCards(upcomingOrCurrentSessions)}
            </TabsContent>
            
            <TabsContent value="past">
                {renderSessionCards(pastSessions)}
            </TabsContent>
        </Tabs>
    </>
  );
}
