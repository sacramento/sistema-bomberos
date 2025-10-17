
'use client';

import * as React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut, Flame, Menu, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { NavItem } from "../layout";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { navItems } from "../layout";

interface MobileNavProps {
    navItems: NavItem[];
}

export default function MobileNav({ navItems: accessibleNavItems }: MobileNavProps) {
    const pathname = usePathname();
    const { user, logout, getActiveRole } = useAuth();
    
    if(!user || pathname === '/dashboard') return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur-sm md:hidden">
             <div className="flex h-16 items-center justify-between px-4">
                 <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <Flame className="h-6 w-6 text-primary" />
                    <span className="font-headline text-lg">SMA</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={logout}>
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Cerrar Sesión</span>
                </Button>
            </div>
        </header>
    );

    const currentModule = React.useMemo(() => {
        // Find the navItem that is the best match for the current path
        const bestMatch = [...navItems]
          .sort((a, b) => b.href.length - a.href.length)
          .find(item => pathname.startsWith(item.href));
        return bestMatch?.module;
      }, [pathname]);
  
    const moduleNavItems = accessibleNavItems.filter(item => {
        const userRoleForItem = getActiveRole(item.href);
        // We use the passed `navItems` prop which is already filtered for accessibility
        return item.module === currentModule && item.roles.includes(userRoleForItem);
    });

    const getLabel = (item: NavItem) => {
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
      movilidad: 'Módulo Movilidad',
      materiales: 'Módulo Materiales',
      general: 'Administración'
    };
    const currentModuleTitle = currentModule ? moduleTitles[currentModule] : "Menú";

    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur-sm md:hidden">
            <div className="flex h-16 items-center justify-between px-4">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                            <span className="sr-only">Abrir menú</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col p-0">
                         <SheetHeader className="h-16 flex-shrink-0 border-b px-6 flex flex-row items-center">
                             <div className="flex-grow">
                                <SheetTitle className="font-headline text-lg">{currentModuleTitle}</SheetTitle>
                             </div>
                        </SheetHeader>
                        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                             {moduleNavItems.map(item => {
                                const label = getLabel(item);
                                let isActive = false;
                                if (item.href === '/weeks/my-week' || item.href === '/weeks/tasks') {
                                    isActive = pathname === item.href;
                                } else if (item.href === '/weeks') {
                                    isActive = pathname === '/weeks' || (pathname.startsWith('/weeks/') && !pathname.startsWith('/weeks/my-week') && !pathname.startsWith('/weeks/tasks'));
                                } else if (item.href === '/sessions') {
                                    isActive = pathname.startsWith('/sessions') || pathname.startsWith('/classes');
                                } else if (item.href === '/materials/vehicles') {
                                    isActive = pathname === item.href;
                                } else if (item.href === '/materials') {
                                    isActive = pathname.startsWith('/materials') && pathname !== '/materials/vehicles';
                                } else {
                                    isActive = pathname.startsWith(item.href);
                                }

                                return (
                                    <SheetClose asChild key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={cn("flex items-center gap-4 rounded-md p-3 text-base font-medium text-muted-foreground transition-all hover:bg-muted hover:text-primary", isActive ? "bg-muted text-primary" : "")}
                                        >
                                            <item.icon className="h-5 w-5" />
                                            <span>{label}</span>
                                        </Link>
                                    </SheetClose>
                                )
                            })}
                        </nav>
                         <div className="mt-auto border-t p-4 space-y-2">
                             <SheetClose asChild>
                                <Button variant="ghost" className="w-full justify-center text-base py-4" asChild>
                                    <Link href="/dashboard">
                                        <ArrowLeft className="h-5 w-5 mr-3" />
                                        <span>Volver a Módulos</span>
                                    </Link>
                                </Button>
                             </SheetClose>
                             <Separator />
                            <div className="flex items-center gap-3 p-2">
                                <Avatar className="size-11">
                                <AvatarImage src={userImage} alt={user.name} className="object-cover" />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <p className="text-base font-semibold">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">{getActiveRole(pathname)}</p>
                                </div>
                            </div>
                            <SheetClose asChild>
                                <Button variant="ghost" className="w-full justify-center text-base py-6" onClick={logout}>
                                    <LogOut className="h-5 w-5 mr-3" />
                                    <span>Cerrar Sesión</span>
                                </Button>
                            </SheetClose>
                        </div>
                    </SheetContent>
                </Sheet>
                 <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <Flame className="h-6 w-6 text-primary" />
                    <span className="font-headline text-lg">SMA</span>
                </Link>
                <div className="w-10"></div>
            </div>
        </header>
    );
}
