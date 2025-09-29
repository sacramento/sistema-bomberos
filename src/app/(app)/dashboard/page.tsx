
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Flame, CalendarCheck, Car } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';

export default function PortalPage() {
  const { user, logout } = useAuth();
  
  const assistanceHref = "/sessions";
  const weeksHref = "/weeks";


  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <Image src="https://i.ibb.co/yF0SYDNF/logo.png" alt="Logo" width={80} height={80} />
        </div>
        <h1 className="font-headline text-3xl md:text-4xl font-semibold tracking-tight">
          Plataforma Unificada SMA
        </h1>
        <p className="text-muted-foreground mt-2">
          Seleccione el módulo al que desea acceder.
        </p>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
        <Link href={assistanceHref} className="transform transition-transform hover:scale-105">
          <Card className="h-full hover:border-primary">
            <CardHeader className="flex flex-row items-center gap-4">
              <Flame className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="font-headline text-2xl">Asistencia</CardTitle>
                <CardDescription>Gestión de capacitación y asistencia.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Acceda para gestionar clases, tomar asistencia, registrar licencias y generar reportes detallados.
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href={weeksHref} className="transform transition-transform hover:scale-105">
          <Card className="h-full hover:border-primary">
            <CardHeader className="flex flex-row items-center gap-4">
              <CalendarCheck className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="font-headline text-2xl">Semanas</CardTitle>
                <CardDescription>Gestión de tareas y personal.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Organice personal en semanas, asigne tareas y genere reportes de actividad.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="#" className="transform transition-transform hover:scale-105" aria-disabled="true" onClick={(e) => e.preventDefault()}>
           <Card className="h-full bg-muted/50 cursor-not-allowed">
            <CardHeader className="flex flex-row items-center gap-4">
              <Car className="h-10 w-10 text-muted-foreground" />
              <div>
                <CardTitle className="font-headline text-2xl text-muted-foreground">Movilidad</CardTitle>
                <CardDescription>Próximamente...</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-muted-foreground">
                Módulo para la gestión de vehículos, órdenes internas y logística de movilidad.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
      {user && (
          <div className="mt-8">
            <Button variant="outline" onClick={logout}>Cerrar Sesión</Button>
          </div>
      )}
       <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Asistencia SMA. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
