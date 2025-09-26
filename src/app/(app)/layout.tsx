'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/auth-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tablero', roles: ['Administrador', 'Ayudantía'] },
  { href: '/firefighters', icon: Users, label: 'Bomberos', roles: ['Administrador'] },
  { href: '/courses', icon: GraduationCap, label: 'Cursos', roles: ['Administrador', 'Ayudantía'] },
  { href: '/classes', icon: CalendarClock, label: 'Clases', roles: ['Administrador', 'Operador', 'Oficial'] },
  { href: '/leaves', icon: ClipboardMinus, label: 'Licencias', roles: ['Administrador', 'Ayudantía', 'Oficial'] },
  { href: '/reports', icon: BarChart3, label: 'Reportes', roles: ['Administrador', 'Operador', 'Ayudantía', 'Bombero', 'Oficial'] },
  { href: '/admin/users', icon: Settings, label: 'Admin Usuarios', roles: ['Administrador'] },
];

function AppSidebar() {
  const pathname = usePathname();
  const { open } = useSidebar();
  const { user, logout } = useAuth();
  
  if (!user) return null;

  const availableNavItems = navItems.filter(item => item.roles.includes(user.role));
  
  const getLabel = (item: typeof navItems[0]) => {
      if (item.href === '/reports' && user.role === 'Bombero') {
          return 'Mi Reporte';
      }
      return item.label;
  }
  
  const userImage = user.photoURL || `https://picsum.photos/seed/${user.id}/200`;

  return (
    <Sidebar>
      <SidebarHeader>
        <div
          className={cn(
            'flex items-center gap-2',
            open ? 'px-2' : 'px-0 justify-center'
          )}
        >
          <Flame className="text-primary size-7" />
          <span
            className={cn(
              'font-headline text-xl font-semibold transition-opacity duration-200',
              open ? 'opacity-100' : 'opacity-0'
            )}
          >
            Asistencia SMA
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {availableNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.href)}
                  tooltip={getLabel(item)}
                >
                  <item.icon />
                  <span>{getLabel(item)}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator className="my-2" />
      <SidebarFooter>
        <div className="flex items-center gap-3 p-2">
           <Avatar className="size-8">
            <AvatarImage src={userImage} alt={user.name} className="object-cover" />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className={cn("flex flex-col", open ? "opacity-100" : "opacity-0", "transition-opacity duration-200")}>
            <p className="text-sm font-medium text-sidebar-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}


function AppHeader() {
  const { logout } = useAuth();
  const { isMobile } = useSidebar();

  if (!isMobile) return null;

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <SidebarTrigger />
        <div className="flex-1 text-center font-headline text-lg font-semibold">
          Asistencia SMA
        </div>
        <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5"/>
            <span className="sr-only">Cerrar Sesión</span>
        </Button>
    </header>
  )
}

function DesktopHeader() {
    const { logout } = useAuth();
    const { isMobile } = useSidebar();

    if (isMobile) return null;
    
    return (
     <header className="sticky top-0 z-10 flex h-16 items-center justify-end gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5"/>
            <span className="sr-only">Cerrar Sesión</span>
        </Button>
    </header>
    )
}

function MainLayoutWithSidebar({ children }: { children: React.ReactNode }) {
    const { isMobile } = useSidebar();

    if (isMobile === undefined) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p>Cargando...</p>
        </div>
      );
    }

    return (
        <div className="flex min-h-screen">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
                <DesktopHeader/>
                <AppHeader />
                <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
            </div>
        </div>
    )
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }
    
    const currentNavItem = navItems.find(item => pathname.startsWith(item.href));
    if(currentNavItem && !currentNavItem.roles.includes(user.role)) {
       const firstAvailablePage = navItems.find(item => item.roles.includes(user.role));
       if (firstAvailablePage) {
           router.push(firstAvailablePage.href);
       } else {
            router.push('/login'); 
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
    <SidebarProvider>
        <MainLayoutWithSidebar>{children}</MainLayoutWithSidebar>
    </SidebarProvider>
  );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
    return <AppLayoutContent>{children}</AppLayoutContent>
}
