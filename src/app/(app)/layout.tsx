
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
import { Separator } from '@/components/ui/separator';

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: ActiveRole[];
  module: 'asistencia' | 'semanas' | 'movilidad' | 'general'
};

export const navItems: NavItem[] = [
  { href: '/sessions', icon: LayoutDashboard, label: 'Dashboard Asistencia', roles: ['Master', 'Oficial', 'Administrador', 'Operador', 'Ayudantía'], module: 'asistencia' },
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
  
  if (!user) return null;

  // Group nav items by module
  const navItemsByModule = navItems.reduce((acc, item) => {
    // Determine the specific role for this item's path
    const itemActiveRole = getActiveRole(item.href);
    // Check if the user's role for this path is in the allowed roles for the item
    if (!item.roles.includes(itemActiveRole)) {
      return acc;
    }
    const module = item.module;
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(item);
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
            
          {moduleOrder.map(moduleKey => (
            navItemsByModule[moduleKey] && (
              <React.Fragment key={moduleKey}>
                {!isCollapsed && (
                    <h4 className="px-3 py-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                        {moduleTitles[moduleKey]}
                    </h4>
                )}
                {navItemsByModule[moduleKey].map((item) => {
                  const label = getLabel(item);
                  const isActive = pathname.startsWith(item.href);
                  const buttonContent = (
                    <Link
                      href={item.href}
                      className={cn( "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", isActive ? "bg-muted text-primary" : "", isCollapsed && "justify-center" )}
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span>{label}</span>}
                    </Link>
                  );

                  return (
                    <div key={item.href}>
                      {isCollapsed ? (
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                          <TooltipContent side="right">{label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        buttonContent
                      )}
                    </div>
                  );
                })}
                 {!isCollapsed && <Separator className="my-2" />}
              </React.Fragment>
            )
          ))}
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
        
        // Find the most specific nav item match for the current path
        const currentNavItem = [...navItems]
            .filter(item => pathname.startsWith(item.href))
            .sort((a,b) => b.href.length - a.href.length)[0];
        
        // If a matching nav item is found, check permissions
        if (currentNavItem) {
            const activeRole = getActiveRole(pathname);
            if (!currentNavItem.roles.includes(activeRole)) {
               router.push('/sessions'); // Redirect to a default safe page
            }
        } else if (pathname !== '/dashboard' && pathname !== '/sessions') {
            // Optional: if no nav item matches and it's not a known dashboard, redirect
            // This can prevent users from accessing invalid URLs
            // router.push('/sessions');
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
    
    // For TopNav, we show all items the user has access to, regardless of current module
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
