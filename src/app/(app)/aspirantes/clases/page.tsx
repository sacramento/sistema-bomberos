
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, ArrowRight, MoreVertical, Edit, Trash2, Search, CalendarClock, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import AddAspiranteClassDialog from './_components/add-class-dialog';
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
import { getAspiranteSessions, deleteAspiranteSession } from '@/services/aspirantes-sessions.service';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import EditAspiranteClassDialog from './_components/edit-class-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseISO, format } from 'date-fns';
import { usePathname } from 'next/navigation';
import { es } from 'date-fns/locale';


const specializations: Session['specialization'][] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'VARIOS'];

export default function AspiranteClassesPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { getActiveRole, user } = useAuth();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialization, setFilterSpecialization] = useState('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());

  const activeRole = getActiveRole(pathname);
  const canManageClasses = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Instructor', [activeRole]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
        const data = await getAspiranteSessions();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDataChange = () => {
    fetchSessions();
  };

  const handleDeleteClass = async (sessionId: string) => {
    try {
        if (!user) throw new Error("Usuario no autenticado.");
        await deleteAspiranteSession(sessionId, user);
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
  }, [sessions, searchTerm, filterSpecialization, filterYear]);


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
                  <p>No se encontraron clases con los filtros aplicados.</p>
              </div>
          );
      }
      
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sessionList.map((session) => {
            const sessionDate = parseISO(session.date);
            const formattedDate = format(sessionDate, "dd 'de' MMMM", { locale: es });

            return (
            <Card key={session.id} className="flex flex-col border-l-4 border-green-500 bg-green-500/5">
               <CardHeader className="p-4 flex-grow">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2 flex-grow">
                    <Badge variant="secondary" className="w-fit">{session.specialization}</Badge>
                    <p className="text-sm text-muted-foreground">{formattedDate} @ {session.startTime}</p>
                  </div>
                  {canManageClasses && (
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <EditAspiranteClassDialog session={session} onClassUpdated={handleDataChange}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          </EditAspiranteClassDialog>
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
                              Esta acción no se puede deshacer. Esto eliminará permanentemente la clase y sus datos asociados.
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
                      <Link href={`/aspirantes/clases/${session.id}/attendance`}>
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
      <PageHeader title="Clases de Aspirantes" description="Cree y gestione las clases de capacitación para aspirantes.">
        {canManageClasses && (
          <AddAspiranteClassDialog onClassAdded={handleDataChange}>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Clase
            </Button>
          </AddAspiranteClassDialog>
        )}
      </PageHeader>
      
      <Card className="mb-8">
          <CardHeader>
              <CardTitle className="font-headline">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              </div>
          </CardContent>
      </Card>
      
        <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-4">
                <TabsTrigger value="current"><CalendarClock className="mr-2 h-4 w-4"/>Actuales y Próximas</TabsTrigger>
                <TabsTrigger value="past"><History className="mr-2 h-4 w-4"/>Pasadas</TabsTrigger>
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
