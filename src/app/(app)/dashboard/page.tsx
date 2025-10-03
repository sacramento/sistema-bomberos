'use client';

import { useAuth } from '@/context/auth-context';
import { navItems } from '../layout';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import type { NavItem } from '../layout';
import { PageHeader } from '@/components/page-header';

const moduleDetails: Record<NavItem['module'], { title: string; description: string; icon: React.ElementType }> = {
    asistencia: {
        title: 'Módulo de Asistencia',
        description: 'Gestione clases, asistencias, licencias y reportes de capacitación.',
        icon: Flame
    },
    semanas: {
        title: 'Módulo de Semanas',
        description: 'Organice guardias, personal y tareas semanales.',
        icon: Flame
    },
    movilidad: {
        title: 'Módulo de Movilidad',
        description: 'Coordine y registre los movimientos de la flota vehicular.',
        icon: Flame
    },
    general: {
        title: 'Administración General',
        description: 'Gestione usuarios, roles y configuraciones del sistema.',
        icon: Flame
    }
};

export default function ModuleSelectionPage() {
  const { user, getActiveRole } = useAuth();
  
  if (!user) return null;

  const accessibleModules = navItems.reduce((acc, item) => {
    const userRole = getActiveRole(item.href);
    if (item.roles.includes(userRole)) {
      if (!acc[item.module]) {
        // Find the highest priority link for the module to use as its main entry point
        const firstValidLink = navItems.find(nav => nav.module === item.module && nav.roles.includes(getActiveRole(nav.href)))?.href || '/dashboard';
        acc[item.module] = { ...moduleDetails[item.module], entryPoint: firstValidLink };
      }
    }
    return acc;
  }, {} as Record<string, { title: string; description: string; icon: React.ElementType, entryPoint: string }>);

  const moduleOrder: (keyof typeof moduleDetails)[] = ['asistencia', 'semanas', 'movilidad', 'general'];


  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <PageHeader 
            title={`Bienvenido/a, ${user.name}`}
            description="Por favor, seleccione un módulo para continuar."
            className='text-center items-center'
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl w-full">
            {moduleOrder.map(moduleKey => {
                const module = accessibleModules[moduleKey];
                if (!module) return null;

                const ModuleIcon = module.icon;

                return (
                     <Link href={module.entryPoint} key={moduleKey} className="group">
                        <Card className="hover:border-primary transition-all duration-200 h-full flex flex-col">
                            <CardHeader className="flex-row items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-lg">
                                     <ModuleIcon className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="font-headline text-xl">{module.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardDescription className="px-6 pb-6 flex-grow">{module.description}</CardDescription>
                            <div className="px-6 pb-4 mt-auto">
                                <div className="flex items-center text-primary font-semibold text-sm group-hover:gap-3 transition-all duration-200">
                                    <span>Ingresar al Módulo</span>
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </div>
                        </Card>
                    </Link>
                )
            })}
        </div>
    </div>
  );
}
