
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
};

export const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Portal', roles: ['Master', 'Oficial', 'Administrador', 'Operador', 'Ayudantía', 'Bombero', 'Encargado'] },
  { href: '/sessions', icon: Flame, label: 'Tablero', roles: ['Master', 'Oficial', 'Administrador', 'Operador', 'Ayudantía'] },
  { href: '/schedule', icon: CalendarDays, label: 'Cronograma', roles: ['Master', 'Oficial', 'Administrador', 'Operador', 'Ayudantía', 'Bombero', 'Encargado'] },
  { href: '/firefighters', icon: Users, label: 'Bomberos', roles: ['Master', 'Oficial', 'Administrador'] },
  { href: '/courses', icon: GraduationCap, label: 'Cursos', roles: ['Master', 'Oficial', 'Administrador', 'Ayudantía'] },
  { href: '/classes', icon: CalendarClock, label: 'Clases', roles: ['Master', 'Oficial', 'Administrador', 'Operador'] },
  { href: '/leaves', icon: ClipboardMinus, label: 'Licencias', roles: ['Master', 'Oficial', 'Administrador', 'Ayudantía'] },
  { href: '/reports', icon: BarChart3, label: 'Reportes', roles: ['Master', 'Oficial', 'Administrador', 'Operador', 'Ayudantía', 'Bombero'] },
  { href: '/admin/users', icon: Settings, label: 'Admin Usuarios', roles: ['Master'] },
];

function Sidebar() {
  const pathname = usePathname();
  const { user, logout, getActiveRole } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const activeRole = getActiveRole(pathname);

  if (!user) return null;
  
  // Filter nav items based on the active role for the current module
  const availableNavItems = navItems.filter(item => {
    if (item.href === '/dashboard') return false; // Exclude portal from sidebar
    return item.roles.includes(activeRole);
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
            {!isCollapsed && <span className="font-headline">Módulo Asistencia</span>}
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

        // This covers dashboard and other top-level pages
        if (pathname === '/dashboard') return;

        const currentTopLevelPath = '/' + (pathname.split('/')[1] || '');
        const currentNavItem = navItems.find(item => item.href === currentTopLevelPath);
        
        if (currentTopLevelPath && currentNavItem && !currentNavItem.roles.includes(activeRole)) {
           // If user doesn't have access, find the first page they DO have access to.
           const firstAvailablePage = navItems.find(item => item.roles.includes(activeRole) && item.href !== '/dashboard');
           router.push(firstAvailablePage ? firstAvailablePage.href : '/dashboard');
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
