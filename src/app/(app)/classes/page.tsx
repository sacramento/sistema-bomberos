'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { sessions as initialSessions } from '@/lib/data';
import { PlusCircle, ArrowRight, User, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AddClassDialog from './_components/add-class-dialog';
import { useState } from 'react';
import { Session } from '@/lib/types';

export default function ClassesPage() {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);

  const handleAddClass = (newClass: Session) => {
    setSessions(prevSessions => [newClass, ...prevSessions]);
  };

  return (
    <>
      <PageHeader title="Clases de Capacitación" description="Cree y gestione clases de capacitación.">
        <AddClassDialog onAddClass={handleAddClass}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Clase
          </Button>
        </AddClassDialog>
      </PageHeader>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
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
    </>
  );
}
