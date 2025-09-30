
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TopNav from './_components/top-nav';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ActiveRole } from '@/context/auth-context';

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: ActiveRole[];
  module: 'asistencia' | 'semanas' | 'movilidad' | 'general'
};

export const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Portal', roles: ['Master', 'Oficial', 'Usuario', 'Administrador', 'Operador', 'Ayudantía', 'Bombero', 'Encargado'], module: 'general' },
  { href: '/sessions', icon: Flame, label: 'Tablero Asistencia', roles: ['Master', 'Oficial', 'Administrador', 'Operador', 'Ayudantía'], module: 'asistencia' },
  { href: '/schedule', icon: CalendarDays, label: 'Cronograma', roles: ['Master', 'Oficial', 'Administrador', 'Operador', 'Ayudantía', 'Bombero'], module: 'asistencia' },
  { href: '/firefighters', icon: Users, label: 'Bomberos', roles: ['Master', 'Oficial', 'Administrador'], module: 'asistencia' },
  { href: '/courses', icon: GraduationCap, label: 'Cursos', roles: ['Master', 'Oficial', 'Administrador', 'Ayudantía'], module: 'asistencia' },
  { href: '/classes', icon: CalendarClock, label: 'Clases', roles: ['Master', 'Oficial', 'Administrador', 'Operador'], module: 'asistencia' },
  { href: '/leaves', icon: ClipboardMinus, label: 'Licencias', roles: ['Master', 'Oficial', 'Administrador', 'Ayudantía'], module: 'asistencia' },
  { href: '/reports', icon: BarChart3, label: 'Reportes', roles: ['Master', 'Oficial', 'Administrador', 'Operador', 'Ayudantía', 'Bombero'], module: 'asistencia' },
  { href: '/weeks', icon: CalendarCheck, label: 'Dashboard Semanas', roles: ['Master', 'Oficial', 'Administrador', 'Encargado', 'Bombero'], module: 'semanas'},
  { href: '/admin/users', icon: Settings, label: 'Admin Usuarios', roles: ['Master'], module: 'general' },
];

function Sidebar() {
  const pathname = usePathname();
  const { user, logout, getActiveRole } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const activeRole = getActiveRole(pathname);
  const currentModulePath = pathname.split('/')[1];

  const getModuleTitle = () => {
    switch(currentModulePath) {
        case 'weeks':
            return 'Módulo Semanas';
        case 'admin':
            return 'Administración';
        default:
            return 'Módulo Asistencia';
    }
  }
  
  if (!user) return null;
  
  const getModuleFromPath = (path: string): 'asistencia' | 'semanas' | 'movilidad' | 'general' => {
    if (['sessions', 'schedule', 'firefighters', 'courses', 'classes', 'leaves', 'reports'].includes(path)) {
        return 'asistencia';
    }
    if (path === 'weeks') {
        return 'semanas';
    }
    if (path === 'admin') {
        return 'general';
    }
    return 'asistencia'; // Default to 'asistencia' if not in another specific module
  }

  const currentModule = getModuleFromPath(currentModulePath);
  
  const availableNavItems = navItems.filter(item => {
    if (item.href === '/dashboard') return false; 
    return item.module === currentModule && item.roles.includes(activeRole);
  });


  const getLabel = (item: NavItem) => {
    if (item.href === '/reports' && activeRole === 'Bombero') {
      return 'Mi Reporte';
    }
    return item.label;
  };
  
  const userImage = `https://picsum.photos/seed/${user.id}/200`;

  return (
    <TooltipProvider>
      <aside className={cn("hidden h-screen md:flex flex-col border-r bg-card transition-all duration-300 ease-in-out", isCollapsed ? "w-16" : "w-64")}>
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Flame className="h-6 w-6 text-primary" />
            {!isCollapsed && <span className="font-headline">{getModuleTitle()}</span>}
          </Link>
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setIsCollapsed(!isCollapsed)}>
            <PanelLeft className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
          </Button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto p-2">
          <ul>
             <li>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                     <Link
                      href="/dashboard"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                        pathname === '/dashboard' && "bg-muted text-primary",
                        isCollapsed && "justify-center"
                      )}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      {!isCollapsed && <span>Portal</span>}
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right">Portal</TooltipContent>}
                </Tooltip>
             </li>
            {availableNavItems.map((item) => {
              const label = getLabel(item);
              const isActive = pathname.startsWith(item.href);
              
              const buttonContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    isActive ? "bg-muted text-primary" : "",
                    isCollapsed && "justify-center"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {!isCollapsed && <span>{label}</span>}
                </Link>
              );

              return (
                <li key={item.href}>
                  {isCollapsed ? (
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                      <TooltipContent side="right">{label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    buttonContent
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto border-t p-2">
           <div className={cn("flex items-center gap-3 p-2", isCollapsed && "justify-center")}>
            <Avatar className="size-9">
              <AvatarImage src={userImage} alt={user.name} className="object-cover" />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex flex-col">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{activeRole}</p>
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
    const isMobile = useIsMobile();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push('/');
            return;
        }
        
        const activeRole = getActiveRole(pathname);
        const currentTopLevelPath = '/' + (pathname.split('/')[1] || '');

        if (pathname === '/dashboard' || currentTopLevelPath === '/') return;

        const currentNavItem = navItems.find(item => item.href === currentTopLevelPath);
        
        if (currentTopLevelPath && currentNavItem && !currentNavItem.roles.includes(activeRole)) {
           // Si el usuario no tiene acceso, lo redirige al portal para que elija otro módulo.
           router.push('/dashboard');
        }

    }, [user, loading, pathname, router, getActiveRole]);

    if (loading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p>Cargando...</p>
            </div>
        );
    }
  
    const showSidebar = pathname !== '/dashboard';
    const showTopNav = isMobile && showSidebar;
    const activeRole = getActiveRole(pathname);

    return (
        <div className="flex min-h-screen w-full">
            {showSidebar && <Sidebar />}
            <div className="flex flex-1 flex-col">
                <main className="flex-1 p-4 sm:p-6 md:p-8 pt-20 md:pt-8">
                    {children}
                </main>
                {showTopNav && <TopNav navItems={navItems} userRole={activeRole} />}
            </div>
        </div>
    );
}
