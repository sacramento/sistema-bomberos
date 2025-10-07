
'use client';

import { useAuth } from '@/context/auth-context';
import { navItems } from '../layout';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import type { NavItem } from '../layout';
import Image from 'next/image';

const moduleDetails: Record<NavItem['module'], { title: string; description: string; icon: React.ElementType }> = {
    asistencia: {
        title: 'Asistencia',
        description: 'Gestione clases, asistencias, licencias y reportes de capacitación.',
        icon: Flame
    },
    semanas: {
        title: 'Semanas',
        description: 'Organice guardias, personal y tareas semanales.',
        icon: Flame
    },
    movilidad: {
        title: 'Movilidad',
        description: 'Coordine y registre los movimientos de la flota vehicular.',
        icon: Flame
    },
    general: {
        title: 'Administración',
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
        const firstValidLink = navItems.find(nav => nav.module === item.module && nav.roles.includes(getActiveRole(nav.href)))?.href || '/dashboard';
        acc[item.module] = { ...moduleDetails[item.module], entryPoint: firstValidLink };
      }
    }
    return acc;
  }, {} as Record<string, { title: string; description: string; icon: React.ElementType, entryPoint: string }>);

  const moduleOrder: (keyof typeof moduleDetails)[] = ['asistencia', 'semanas', 'movilidad', 'general'];


  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(space.24))] p-4 sm:p-6 md:p-8">
        <div className="flex flex-col items-center text-center mb-12">
            <Image src="https://i.ibb.co/yF0SYDNF/logo.png" alt="Logo" width={128} height={128} className="mb-4" />
            <h1 className="font-headline text-3xl md:text-4xl font-semibold tracking-tight text-slate-100">
                Bienvenido/a, {user.name}
            </h1>
            <p className="text-slate-300 mt-2">
                Por favor, seleccione un módulo para continuar.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl w-full">
            {moduleOrder.map(moduleKey => {
                const module = accessibleModules[moduleKey];
                if (!module) return null;

                const ModuleIcon = module.icon;

                return (
                     <Link href={module.entryPoint} key={moduleKey} className="group">
                        <Card className="hover:shadow-2xl transition-all duration-300 h-full flex flex-col hover:-translate-y-2 bg-card/60 backdrop-blur-sm border-white/20">
                            <CardHeader className="flex-row items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-lg">
                                     <ModuleIcon className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="font-headline text-2xl">{module.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardDescription className="px-6 pb-6 flex-grow">{module.description}</CardDescription>
                            <div className="px-6 pb-4 mt-auto">
                                <div className="flex items-center text-primary font-semibold group-hover:gap-3 transition-all duration-200">
                                    <span>Ingresar al Módulo</span>
                                    <ArrowRight className="h-5 w-5" />
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
