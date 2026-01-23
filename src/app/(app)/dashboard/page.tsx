

'use client';

import { useAuth } from '@/context/auth-context';
import { navItems } from '../layout';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowRight, Flame, Package, ClipboardMinus, Shirt, Siren, Droplets } from 'lucide-react';
import type { NavItem } from '../layout';
import Image from 'next/image';

const moduleDetails: Record<string, { title: string; description: string; icon: React.ElementType }> = {
    asistencia: {
        title: 'Asistencia',
        description: 'Gestione clases, asistencias y reportes de capacitación.',
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
    materiales: {
        title: 'Materiales',
        description: 'Gestione el inventario de materiales y equipos de los cuarteles.',
        icon: Package
    },
    roperia: {
        title: 'Ropería',
        description: 'Controle el inventario de ropa y equipo personal.',
        icon: Shirt
    },
    ayudantia: {
        title: 'Ayudantía',
        description: 'Gestione licencias y sanciones del personal.',
        icon: ClipboardMinus
    },
    servicios: {
        title: 'Servicios',
        description: 'Registre y administre todas las intervenciones y servicios.',
        icon: Siren
    },
    cascada: {
        title: 'Cascada',
        description: 'Registre y consulte las cargas de equipos de respiración.',
        icon: Droplets
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

  const moduleOrder: (keyof typeof moduleDetails)[] = ['asistencia', 'semanas', 'movilidad', 'materiales', 'roperia', 'ayudantia', 'servicios', 'cascada', 'general'];


  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-theme(space.24))] p-4 sm:p-6 md:p-8 overflow-hidden">
        <div className="z-10 flex flex-col items-center text-center mb-12">
            <Image src="https://i.ibb.co/yF0SYDNF/logo.png" alt="Logo" width={100} height={100} className="mb-4" />
            <h1 className="font-headline text-3xl md:text-4xl font-semibold tracking-tight text-slate-800">
                Bienvenido/a, {user.name}
            </h1>
            <p className="text-slate-600 mt-2">
                Por favor, seleccione un módulo para continuar.
            </p>
        </div>
        
        <div className="z-10 w-full max-w-xl">
            <ul className="space-y-4">
                {moduleOrder.map(moduleKey => {
                    const module = accessibleModules[moduleKey];
                    if (!module) return null;

                    const ModuleIcon = module.icon;

                    return (
                        <li key={moduleKey}>
                            <Link href={module.entryPoint} className="group">
                                <Card className="bg-white shadow-md hover:shadow-xl hover:border-primary/50 transition-all duration-200 h-full flex items-center p-4">
                                    <div className="p-3 bg-primary/10 rounded-lg mr-4">
                                        <ModuleIcon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-headline text-lg font-semibold">{module.title}</p>
                                        <p className="text-sm text-muted-foreground">{module.description}</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors ml-4" />
                                </Card>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </div>
    </div>
  );
}
