'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Flame,
  LayoutDashboard,
  Users,
  CalendarClock,
  ClipboardMinus,
  BarChart3,
  Settings,
  LogOut,
  GraduationCap,
  PanelLeft,
  CalendarDays,
  Car,
  CalendarCheck,
  ListTodo,
  UserSquare,
  BookCopy,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { ActiveRole } from '@/context/auth-context';
import MobileNav from './_components/mobile-nav';

export type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: ActiveRole[];
  module: 'asistencia' | 'semanas' | 'movilidad' | 'general';
};

export const navItems: NavItem[] = [
  { href: '/sessions', icon: LayoutDashboard, label: 'Dashboard Asistencia', roles: ['Master', 'Administrador', 'Oficial', 'Instructor'], module: 'asistencia' },
  { href: '/classes', icon: CalendarClock, label: 'Clases', roles: ['Master', 'Administrador', 'Instructor', 'Oficial'], module: 'asistencia' },
  { href: '/schedule', icon: CalendarDays, label: 'Cronograma', roles: ['Master', 'Administrador', 'Oficial', 'Instructor', 'Ayudantía', 'Bombero'], module: 'asistencia' },
  { href: '/firefighters', icon: Users, label: 'Bomberos', roles: ['Master', 'Administrador', 'Oficial'], module: 'asistencia' },
  { href: '/courses', icon: GraduationCap, label: 'Cursos', roles: ['Master', 'Administrador', 'Oficial', 'Ayudantía'], module: 'asistencia' },
  { href: '/leaves', icon: ClipboardMinus, label: 'Licencias', roles: ['Master', 'Administrador', 'Oficial', 'Ayudantía'], module: 'asistencia' },
  { href: '/reports', icon: BarChart3, label: 'Reportes', roles: ['Master', 'Administrador', 'Oficial', 'Instructor', 'Ayudantía', 'Bombero'], module: 'asistencia' },
  { href: '/weeks/my-week', icon: UserSquare, label: 'Mi Semana', roles: ['Master', 'Administrador', 'Oficial', 'Encargado', 'Bombero'], module: 'semanas'},
  { href: '/weeks', icon: CalendarCheck, label: 'Semanas', roles: ['Master', 'Administrador', 'Oficial', 'Encargado', 'Bombero'], module: 'semanas'},
  { href: '/weeks/tasks', icon: ListTodo, label: 'Tareas', roles: ['Master', 'Administrador', 'Oficial'], module: 'semanas'},
  { href: '/admin/users', icon: Settings, label: 'Admin Usuarios', roles: ['Master'], module: 'general' },
  { href: '/admin/logs', icon: BookCopy, label: 'Bitácora', roles: ['Master'], module: 'general' },
];


function Sidebar() {
  const pathname = usePathname();
  const { user, logout, getActiveRole } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  if (!user || pathname === '/dashboard') {
    return null;
  }

  const currentModuleKey = navItems.find(item => item.href.split('/')[1] && pathname.includes(item.href.split('/')[1]))?.module;
  const currentModule = currentModuleKey;
  
  const moduleNavItems = navItems.filter(item => {
      const userRoleForItem = getActiveRole(item.href);
      return item.module === currentModule && item.roles.includes(userRoleForItem);
  });
  
  const moduleTitles = {
      asistencia: 'Módulo Asistencia',
      semanas: 'Módulo Semanas',
      movilidad: 'Módulo Movilidad',
      general: 'Administración'
  };
  const currentModuleTitle = currentModule ? moduleTitles[currentModule] : "Menú";

  const getLabel = (item: NavItem) => {
    const itemActiveRole = getActiveRole(item.href);
    if (item.href === '/reports' && itemActiveRole === 'Bombero') {
      return 'Mi Reporte';
    }
    return item.label;
  };
  
  const userImage = `https://picsum.photos/seed/${user.id}/200`;
  const userRoleDisplay = getActiveRole(pathname);

  return (
    <TooltipProvider>
      <aside className={cn("hidden h-screen md:flex flex-col border-r bg-card transition-all duration-300 ease-in-out", isCollapsed ? "w-16" : "w-64")}>
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Flame className="h-6 w-6 text-primary" />
            {!isCollapsed && <span className="font-headline">Plataforma SMA</span>}
          </Link>
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setIsCollapsed(!isCollapsed)}>
            <PanelLeft className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
          </Button>
        </div>
        
        <nav className="flex-1 space-y-2 overflow-y-auto p-2">
            {!isCollapsed && (
                <div className="px-3 py-2">
                    <h2 className="mb-2 text-lg font-semibold tracking-tight font-headline">{currentModuleTitle}</h2>
                    <div className="space-y-1">
                        {moduleNavItems.map(item => {
                            const label = getLabel(item);
                            let isActive = pathname.startsWith(item.href);
                             if (item.href === '/weeks' && (pathname.startsWith('/weeks/') && !pathname.startsWith('/weeks/my-week') && !pathname.startsWith('/weeks/tasks')) ) {
                                isActive = true;
                            } else if (item.href === '/sessions') {
                                isActive = pathname.startsWith('/sessions') || pathname.startsWith('/classes');
                            }
                            
                            return (
                                <Link key={item.href} href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                        isActive ? "bg-muted text-primary" : ""
                                    )}>
                                    <item.icon className="h-4 w-4" />
                                    <span>{label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
            {isCollapsed && moduleNavItems.map(item => {
                const label = getLabel(item);
                let isActive = pathname.startsWith(item.href);
                 if (item.href === '/weeks' && (pathname.startsWith('/weeks/') && !pathname.startsWith('/weeks/my-week') && !pathname.startsWith('/weeks/tasks')) ) {
                    isActive = true;
                } else if (item.href === '/sessions') {
                    isActive = pathname.startsWith('/sessions') || pathname.startsWith('/classes');
                }
                
                return (
                    <Tooltip key={item.href} delayDuration={0}>
                        <TooltipTrigger asChild>
                            <Link href={item.href}
                                className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8", isActive && "bg-accent text-accent-foreground")}>
                                <item.icon className="h-5 w-5" />
                                <span className="sr-only">{label}</span>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{label}</TooltipContent>
                    </Tooltip>
                );
            })}
        </nav>

        <div className="mt-auto border-t p-2">
           {!isCollapsed && (
                <Button variant="ghost" className="w-full justify-start mb-2" asChild>
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Módulos
                    </Link>
                </Button>
           )}
           <div className={cn("flex items-center gap-3 p-2", isCollapsed && "justify-center")}>
            <Avatar className="size-9">
              <AvatarImage src={userImage} alt={user.name} className="object-cover" />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex flex-col">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{userRoleDisplay}</p>
              </div>
            )}
          </div>
          <Button variant="ghost" className={cn("w-full", isCollapsed ? "justify-center" : "justify-start")} onClick={logout}>
            <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, getActiveRole } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push('/');
            return;
        }
        
        // Don't run permission checks on the dashboard itself.
        if (pathname === '/dashboard') {
            return;
        }

        // Find the nav item that best matches the current URL.
        const currentNavItem = [...navItems]
            .sort((a,b) => b.href.length - a.href.length)
            .find(item => pathname.startsWith(item.href));

        if (currentNavItem) {
            const activeRole = getActiveRole(pathname);
            if (!currentNavItem.roles.includes(activeRole)) {
               console.warn(`Role mismatch: User role '${activeRole}' does not have access to '${pathname}'. Redirecting to dashboard.`);
               router.push('/dashboard'); 
            }
        } else if (pathname !== '/') {
            const moduleKey = navItems.find(item => item.href.split('/')[1] && pathname.includes(item.href.split('/')[1]))?.module;
            if (!moduleKey) {
                 console.warn(`No module found for path: ${pathname}. Redirecting to dashboard.`);
                 router.push('/dashboard');
            }
        }

    }, [user, loading, pathname, router, getActiveRole]);

    if (loading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Cargando...</p>
                </div>
            </div>
        );
    }
  
    const availableNavItems = navItems.filter(item => {
        const role = getActiveRole(item.href);
        return item.roles.includes(role);
    });

    return (
        <div className="flex min-h-screen w-full bg-muted/40">
            <Sidebar />
            <div className="flex flex-1 flex-col">
                <MobileNav navItems={availableNavItems} />
                <main className={cn("flex-1 p-4 sm:p-6 md:p-8", "md:pt-8 pt-20")}>
                    {children}
                </main>
            </div>
        </div>
    );
}
