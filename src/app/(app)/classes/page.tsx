'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { sessions as initialSessions } from '@/lib/data';
import { PlusCircle, ArrowRight, User, Users, CalendarIcon, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AddClassDialog from './_components/add-class-dialog';
import { useState, useMemo } from 'react';
import { Session } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const specializations = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE', 'VARIOS'];

export default function ClassesPage() {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialization, setFilterSpecialization] = useState('all');
  const [filterStation, setFilterStation] = useState('all');
  const [filterHierarchy, setFilterHierarchy] = useState('all');
  const [filterDate, setFilterDate] = useState<Date | undefined>();

  const handleAddClass = (newClass: Session) => {
    setSessions(prevSessions => [newClass, ...prevSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

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

      // Filter by date
      if (filterDate && format(new Date(session.date), 'yyyy-MM-dd') !== format(filterDate, 'yyyy-MM-dd')) {
        return false;
      }
      
      // Filter by station and hierarchy (checks attendees)
      const attendees = session.attendees;
      
      let stationMatch = true;
      if (filterStation !== 'all') {
          stationMatch = attendees.some(a => a.firehouse === `Cuartel ${filterStation.split('-')[1]}`);
      }

      let hierarchyMatch = true;
      if (filterHierarchy !== 'all') {
          if (filterHierarchy === 'bomberos') {
              hierarchyMatch = attendees.some(a => ['BOMBERO', 'CABO', 'CABO PRIMERO'].includes(a.rank));
          } else if (filterHierarchy === 'oficiales') {
              hierarchyMatch = attendees.some(a => ['SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR', 'OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'].includes(a.rank));
          }
      }

      return stationMatch && hierarchyMatch;
    });
  }, [sessions, searchTerm, filterSpecialization, filterStation, filterHierarchy, filterDate]);


  return (
    <>
      <PageHeader title="Clases de Capacitación" description="Cree, gestione y filtre clases de capacitación.">
        <AddClassDialog onAddClass={handleAddClass}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Clase
          </Button>
        </AddClassDialog>
      </PageHeader>
      
      {/* Filters Section */}
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
                                <SelectItem value="bomberos">Solo Bomberos y Cabos</SelectItem>
                                <SelectItem value="oficiales">Solo Suboficiales y Oficiales</SelectItem>
                            </SelectContent>
                         </Select>
                    </div>
                  <div className="space-y-2">
                      <Label>Fecha</Label>
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button
                                  variant={"outline"}
                                  className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !filterDate && "text-muted-foreground"
                                  )}
                              >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {filterDate ? format(filterDate, "PPP") : <span>Seleccionar fecha</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                              <Calendar
                                  mode="single"
                                  selected={filterDate}
                                  onSelect={setFilterDate}
                                  initialFocus
                              />
                          </PopoverContent>
                      </Popover>
                  </div>
              </div>
          </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredSessions.map((session) => (
          <Card key={session.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{session.specialization}</Badge>
                <p className="text-sm text-muted-foreground">{session.date} @ {session.startTime}</p>
              </div>
              <CardTitle className="font-headline pt-2">{session.title}</CardTitle>
              <CardDescription>{session.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
               <div className="space-y-2">
                 <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Instructor: {session.instructors.map(i => i.name).join(', ')}</span>
                 </div>
                  {session.assistants && session.assistants.length > 0 && (
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Ayudantes: {session.assistants.map(a => a.name).join(', ')}</span>
                    </div>
                  )}
                 <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{session.attendees.length} Asistentes</span>
                 </div>
                 <div className="flex items-center gap-2 pt-2">
                    <TooltipProvider>
                    {session.attendees.slice(0, 5).map(attendee => (
                        <Tooltip key={attendee.id}>
                            <TooltipTrigger>
                                <Avatar>
                                    <AvatarImage src={`https://picsum.photos/seed/${attendee.id}/100`} alt={attendee.name} data-ai-hint="person avatar" />
                                    <AvatarFallback>{attendee.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{attendee.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                    {session.attendees.length > 5 && (
                         <Avatar>
                            <AvatarFallback>+{session.attendees.length - 5}</AvatarFallback>
                        </Avatar>
                    )}
                    </TooltipProvider>
                 </div>
               </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/classes/${session.id}/attendance`}>
                  Registrar Asistencia
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
       {filteredSessions.length === 0 && (
        <div className="text-center text-muted-foreground py-16">
            <p>No se encontraron clases con los filtros aplicados.</p>
        </div>
      )}
    </>
  );
}
