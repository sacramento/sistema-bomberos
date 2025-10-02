

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
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: ActiveRole[];
  module: 'asistencia' | 'semanas' | 'movilidad' | 'general';
};

export const navItems: NavItem[] = [
  { href: '/sessions', icon: LayoutDashboard, label: 'Dashboard Asistencia', roles: ['Master', 'Administrador', 'Oficial', 'Instructor'], module: 'asistencia' },
  { href: '/classes', icon: CalendarClock, label: 'Clases', roles: ['Master', 'Administrador', 'Instructor'], module: 'asistencia' },
  { href: '/schedule', icon: CalendarDays, label: 'Cronograma', roles: ['Master', 'Administrador', 'Oficial', 'Instructor', 'Ayudantía', 'Bombero'], module: 'asistencia' },
  { href: '/courses', icon: GraduationCap, label: 'Cursos', roles: ['Master', 'Administrador', 'Oficial', 'Ayudantía'], module: 'asistencia' },
  { href: '/leaves', icon: ClipboardMinus, label: 'Licencias', roles: ['Master', 'Administrador', 'Oficial', 'Ayudantía'], module: 'asistencia' },
  { href: '/reports', icon: BarChart3, label: 'Reportes', roles: ['Master', 'Administrador', 'Oficial', 'Instructor', 'Ayudantía', 'Bombero'], module: 'asistencia' },
  { href: '/weeks', icon: CalendarCheck, label: 'Semanas', roles: ['Master', 'Administrador', 'Oficial', 'Encargado', 'Bombero'], module: 'semanas'},
  { href: '/weeks/my-week', icon: UserSquare, label: 'Mi Semana', roles: ['Master', 'Administrador', 'Oficial', 'Encargado', 'Bombero'], module: 'semanas'},
  { href: '/weeks/tasks', icon: ListTodo, label: 'Tareas', roles: ['Master', 'Administrador', 'Oficial'], module: 'semanas'},
  { href: '/admin/users', icon: Settings, label: 'Admin Usuarios', roles: ['Master'], module: 'general' },
  { href: '/admin/logs', icon: BookCopy, label: 'Bitácora', roles: ['Master'], module: 'general' },
];

function Sidebar() {
  const pathname = usePathname();
  const { user, logout, getActiveRole } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  if (!user) return null;

  // Group nav items by module, filtered by role
  const navItemsByModule = navItems.reduce((acc, item) => {
    const userRoleForItem = getActiveRole(item.href);
    if (item.roles.includes(userRoleForItem)) {
      const module = item.module;
      if (!acc[module]) {
        acc[module] = [];
      }
      acc[module].push(item);
    }
    return acc;
  }, {} as Record<string, NavItem[]>);


  const getLabel = (item: NavItem) => {
    // Determine role based on the item's specific path
    const itemActiveRole = getActiveRole(item.href);
    if (item.href === '/reports' && itemActiveRole === 'Bombero') {
      return 'Mi Reporte';
    }
    return item.label;
  };
  
  const userImage = `https://picsum.photos/seed/${user.id}/200`;

  const moduleTitles = {
      asistencia: 'Módulo Asistencia',
      semanas: 'Módulo Semanas',
      general: 'Administración'
  };
  
  const moduleOrder: (keyof typeof moduleTitles)[] = ['asistencia', 'semanas', 'general'];
  
  const userRoleDisplay = getActiveRole(pathname);

  const currentModule = navItems.find(item => pathname.startsWith(item.href))?.module;

  return (
    <TooltipProvider>
      <aside className={cn("hidden h-screen md:flex flex-col border-r bg-card transition-all duration-300 ease-in-out", isCollapsed ? "w-16" : "w-64")}>
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/sessions" className="flex items-center gap-2 font-semibold">
            <Flame className="h-6 w-6 text-primary" />
            {!isCollapsed && <span className="font-headline">Plataforma SMA</span>}
          </Link>
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setIsCollapsed(!isCollapsed)}>
            <PanelLeft className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
          </Button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto p-2">
            {isCollapsed ? (
                 moduleOrder.flatMap(moduleKey => 
                    navItemsByModule[moduleKey]?.map(item => {
                         const label = getLabel(item);
                         const isActive = pathname.startsWith(item.href) && (item.href !== '/sessions' || pathname === '/sessions');

                         return (
                            <Tooltip key={item.href} delayDuration={0}>
                              <TooltipTrigger asChild>
                                  <Link
                                    href={item.href}
                                    className={cn( "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8", isActive && "bg-accent text-accent-foreground" )}
                                  >
                                    <item.icon className="h-5 w-5" />
                                    <span className="sr-only">{label}</span>
                                  </Link>
                              </TooltipTrigger>
                              <TooltipContent side="right">{label}</TooltipContent>
                            </Tooltip>
                         )
                    })
                )
            ) : (
                <Accordion type="multiple" defaultValue={currentModule ? [currentModule] : ['asistencia']} className="w-full">
                    {moduleOrder.map(moduleKey => (
                         navItemsByModule[moduleKey] && (
                            <AccordionItem value={moduleKey} key={moduleKey}>
                                <AccordionTrigger className="text-sm font-semibold text-muted-foreground hover:no-underline hover:text-primary px-3 py-2">
                                    {moduleTitles[moduleKey]}
                                </AccordionTrigger>
                                <AccordionContent className="pl-4">
                                     {navItemsByModule[moduleKey].map(item => {
                                        const label = getLabel(item);
                                        let isActive = false;
                                        if (item.href === '/weeks/my-week') {
                                            isActive = pathname === item.href;
                                        } else if (item.href === '/weeks' && !pathname.startsWith('/weeks/my-week') && !pathname.startsWith('/weeks/tasks')) {
                                            isActive = pathname.startsWith('/weeks');
                                        } else if (item.href === '/weeks/tasks') {
                                            isActive = pathname === item.href;
                                        } else if (item.href === '/sessions') {
                                            isActive = pathname.startsWith('/sessions') || pathname.startsWith('/classes');
                                        } else {
                                            isActive = pathname.startsWith(item.href);
                                        }

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn( "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", isActive ? "bg-muted text-primary" : "" )}
                                            >
                                                <item.icon className="h-4 w-4" />
                                                <span>{label}</span>
                                            </Link>
                                        )
                                     })}
                                </AccordionContent>
                            </AccordionItem>
                         )
                    ))}
                </Accordion>
            )}
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
    const isMobile = useIsMobile();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push('/');
            return;
        }
        
        const currentNavItem = [...navItems]
            // Sort by href length descending to match more specific paths first (e.g., /weeks/my-week before /weeks)
            .sort((a,b) => b.href.length - a.href.length)
            .find(item => pathname.startsWith(item.href));

        if (currentNavItem) {
            const activeRole = getActiveRole(pathname);
            if (!currentNavItem.roles.includes(activeRole)) {
               console.log(`Role mismatch: User role '${activeRole}' does not have access to '${pathname}'. Redirecting.`);
               router.push('/sessions'); 
            }
        } else if (pathname !== '/dashboard' && !pathname.startsWith('/classes/') && !pathname.startsWith('/weeks/')) {
            console.log(`No matching nav item for '${pathname}'. Redirecting.`);
            router.push('/sessions');
        }

    }, [user, loading, pathname, router, getActiveRole]);

    if (loading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p>Cargando...</p>
            </div>
        );
    }
  
    const showSidebar = true;
    const showTopNav = isMobile;
    const activeRole = getActiveRole(pathname);
    
    const availableNavItemsForTopNav = navItems.filter(item => item.roles.includes(getActiveRole(item.href)));

    return (
        <div className="flex min-h-screen w-full">
            {showSidebar && <Sidebar />}
            <div className="flex flex-1 flex-col">
                {showTopNav && <TopNav navItems={availableNavItemsForTopNav} userRole={activeRole} />}
                <main className="flex-1 p-4 sm:p-6 md:p-8 pt-20 md:pt-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
