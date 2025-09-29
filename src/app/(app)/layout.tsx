
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TopNav from './_components/top-nav';
import { useIsMobile } from '@/hooks/use-mobile';


export const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tablero', roles: ['Administrador', 'Ayudantía'] },
  { href: '/firefighters', icon: Users, label: 'Bomberos', roles: ['Administrador'] },
  { href: '/courses', icon: GraduationCap, label: 'Cursos', roles: ['Administrador', 'Ayudantía'] },
  { href: '/classes', icon: CalendarClock, label: 'Clases', roles: ['Administrador', 'Operador', 'Oficial'] },
  { href: '/leaves', icon: ClipboardMinus, label: 'Licencias', roles: ['Administrador', 'Ayudantía', 'Oficial'] },
  { href: '/reports', icon: BarChart3, label: 'Reportes', roles: ['Administrador', 'Operador', 'Ayudantía', 'Bombero', 'Oficial'] },
  { href: '/admin/users', icon: Settings, label: 'Admin Usuarios', roles: ['Administrador'] },
];

function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!user) return null;

  const availableNavItems = navItems.filter(item => item.roles.includes(user.role));

  const getLabel = (item: typeof navItems[0]) => {
    if (item.href === '/reports' && user.role === 'Bombero') {
      return 'Mi Reporte';
    }
    return item.label;
  };
  
  const userImage = `https://picsum.photos/seed/${user.id}/200`;

  return (
    <TooltipProvider>
      <aside className={cn("hidden h-screen md:flex flex-col border-r bg-card transition-all duration-300 ease-in-out", isCollapsed ? "w-16" : "w-64")}>
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Flame className="h-6 w-6 text-primary" />
            {!isCollapsed && <span className="font-headline">Plataforma SMA</span>}
          </Link>
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setIsCollapsed(!isCollapsed)}>
            <PanelLeft className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
          </Button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto p-2">
          <ul>
            {availableNavItems.map((item) => {
              const label = getLabel(item);
              const buttonContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    pathname.startsWith(item.href) && "bg-muted text-primary",
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
                <p className="text-xs text-muted-foreground">{user.role}</p>
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
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const isMobile = useIsMobile();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        // Find the current top-level route being accessed
        const currentTopLevelPath = '/' + (pathname.split('/')[1] || '');
        
        // This is a special exception for the portal page
        if (currentTopLevelPath === '/') {
            return;
        }

        const currentNavItem = navItems.find(item => item.href === currentTopLevelPath);
        
        if (currentTopLevelPath && currentNavItem && !currentNavItem.roles.includes(user.role)) {
           const firstAvailablePage = navItems.find(item => item.roles.includes(user.role));
           if (firstAvailablePage) {
               router.push(firstAvailablePage.href);
           } else {
                router.push('/'); // Redirect to portal if no pages are available for some reason
           }
        }

    }, [user, loading, pathname, router]);

    if (loading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p>Cargando...</p>
            </div>
        );
    }
  
    return (
        <div className="flex min-h-screen w-full">
            <Sidebar />
            <div className="flex flex-1 flex-col">
                <main className="flex-1 p-4 sm:p-6 md:p-8 pt-20 md:pt-8">
                    {children}
                </main>
                {isMobile && user && <TopNav navItems={navItems} userRole={user.role} />}
            </div>
        </div>
    );
}
