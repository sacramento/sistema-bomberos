
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, ArrowRight, MoreVertical, Edit, Trash2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import AddClassDialog from './_components/add-class-dialog';
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
import { getSessions, deleteSession } from '@/services/sessions.service';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import EditClassDialog from './_components/edit-class-dialog';

const specializations = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE', 'VARIOS'];

const hierarchyOptions = [
    { value: 'bomberos', label: 'Bomberos' },
    { value: 'suboficiales_oficiales', label: 'Suboficiales y Oficiales' },
    { value: 'aspirantes', label: 'Aspirantes' }
];

export default function ClassesPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialization, setFilterSpecialization] = useState('all');
  const [filterStation, setFilterStation] = useState('all');
  const [filterHierarchy, setFilterHierarchy] = useState('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());


  const fetchSessions = async () => {
    setLoading(true);
    try {
        const data = await getSessions();
        setSessions(data);
    } catch(error) {
         toast({
            title: "Error",
            description: "No se pudieron cargar las clases.",
            variant: "destructive"
        })
    } finally {
        setLoading(false);
    }
  }
  
  useEffect(() => {
    fetchSessions();
  }, [])


  const handleDataChange = () => {
    fetchSessions();
  };

  const handleDeleteClass = async (sessionId: string) => {
    try {
        await deleteSession(sessionId);
        toast({
            title: "Éxito",
            description: "La clase ha sido eliminada."
        });
        fetchSessions();
    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message || "No se pudo eliminar la clase.",
            variant: "destructive"
        });
    }
  };
  
  const getCardBorderColor = (session: Session): string => {
    if (!session.attendees || session.attendees.length === 0) return 'border-gray-500';
    
    const suboficialRanks = ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR'];
    const oficialRanks = ['OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'];
    const suboficialesYOficialesRanks = [...suboficialRanks, ...oficialRanks];

    const isOnlyAspirantes = session.attendees.every(a => a.rank === 'ASPIRANTE');
    const isOnlySuboficialesYOficiales = session.attendees.every(a => suboficialesYOficialesRanks.includes(a.rank));

    if (isOnlyAspirantes) return 'border-orange-500';
    if (isOnlySuboficialesYOficiales) return 'border-red-500';

    const firehouses = new Set(session.attendees.map(a => a.firehouse));
    if (firehouses.size === 1) {
        const firehouse = firehouses.values().next().value;
        if (firehouse === 'Cuartel 1') return 'border-yellow-500';
        if (firehouse === 'Cuartel 2') return 'border-blue-500';
        if (firehouse === 'Cuartel 3') return 'border-green-500';
    }

    return 'border-gray-500'; // Default for "Todos" or mixed
  };

  const availableYears = useMemo(() => {
    const years = new Set(sessions.map(s => new Date(s.date).getFullYear().toString()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [sessions]);


  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      // Filter by search term (title)
      if (searchTerm && !session.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by specialization
      if (filterSpecialization !== 'all' && session.specialization !== filterSpecialization) {
        return false;
      }
      
      // Filter by Year
      if (filterYear !== 'all') {
          const sessionYear = new Date(session.date).getFullYear().toString();
          if(sessionYear !== filterYear) return false;
      }
      
      // Filter by station and hierarchy (checks attendees)
      const attendees = session.attendees;
      
      let stationMatch = true;
      if (filterStation !== 'all') {
          stationMatch = attendees.some(a => a.firehouse === `Cuartel ${filterStation.split('-')[1]}`);
      }

      let hierarchyMatch = true;
      if (filterHierarchy !== 'all') {
        const suboficialRanks = ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR'];
        const oficialRanks = ['OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'];

        if (filterHierarchy === 'bomberos') {
            hierarchyMatch = attendees.some(a => a.rank === 'BOMBERO');
        } else if (filterHierarchy === 'suboficiales_oficiales') {
            hierarchyMatch = attendees.some(a => [...suboficialRanks, ...oficialRanks].includes(a.rank));
        } else if (filterHierarchy === 'aspirantes') {
            hierarchyMatch = attendees.some(a => a.rank === 'ASPIRANTE');
        }
      }

      return stationMatch && hierarchyMatch;
    });
  }, [sessions, searchTerm, filterSpecialization, filterStation, filterHierarchy, filterYear]);


  return (
    <>
      <PageHeader title="Clases de Capacitación" description="Cree, gestione y filtre clases de capacitación.">
        <AddClassDialog onClassAdded={handleDataChange}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Clase
          </Button>
        </AddClassDialog>
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
                               <SelectItem value="station-1">Cuartel 1</SelectItem>
                               <SelectItem value="station-2">Cuartel 2</SelectItem>
                               <SelectItem value="station-3">Cuartel 3</SelectItem>
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
      
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredSessions.map((session) => (
            <Card key={session.id} className={cn("flex flex-col border-l-4", getCardBorderColor(session))}>
               <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2 flex-grow">
                    <Badge variant="secondary" className="w-fit">{session.specialization}</Badge>
                    <p className="text-sm text-muted-foreground">{session.date} @ {session.startTime}</p>
                  </div>
                  {user?.role === 'Administrador' && (
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <EditClassDialog session={session} onClassUpdated={handleDataChange}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          </EditClassDialog>
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
                              Esta acción no se puede deshacer. Esto eliminará permanentemente la clase
                              y sus datos asociados.
                          </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteClass(session.id)} variant="destructive">
                              Eliminar
                          </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <CardTitle className="font-headline pt-2">{session.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                  <div className="space-y-2 text-sm">
                      <div className="font-medium">Instructores: <span className="font-normal text-muted-foreground">{session.instructors.map(i => `${i.firstName} ${i.lastName}`).join(', ')}</span></div>
                      {session.assistants && session.assistants.length > 0 && (
                          <div className="font-medium">Ayudantes: <span className="font-normal text-muted-foreground">{session.assistants.map(a => `${a.firstName} ${a.lastName}`).join(', ')}</span></div>
                      )}
                  </div>
              </CardContent>
              <CardFooter>
                   <Button asChild className="w-full">
                      <Link href={`/classes/${session.id}/attendance`}>
                          Gestionar Asistencia
                          <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                  </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
       {filteredSessions.length === 0 && !loading && (
        <div className="text-center text-muted-foreground py-16">
            <p>No se encontraron clases con los filtros aplicados.</p>
        </div>
      )}
    </>
  );
}

    
