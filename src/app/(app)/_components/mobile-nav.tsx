
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut, Flame, Menu } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import type { navItems } from "../layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface MobileNavProps {
    navItems: typeof navItems;
}

export default function MobileNav({ navItems }: MobileNavProps) {
    const pathname = usePathname();
    const { user, logout, getActiveRole } = useAuth();
    
    if(!user) return null;

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
      }, {} as Record<string, (typeof navItems[0])[]>);

    const getLabel = (item: typeof navItems[0]) => {
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
    const currentModule = navItems.find(item => pathname.startsWith(item.href))?.module;

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
                    <SheetContent side="left" className="flex flex-col">
                         <div className="flex h-16 items-center border-b px-4 -ml-6 -mt-6">
                            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                                <Flame className="h-6 w-6 text-primary" />
                                <span className="font-headline">Plataforma SMA</span>
                            </Link>
                        </div>
                        <nav className="flex-1 overflow-y-auto p-2 -ml-6">
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
                                                    } else if (item.href === '/weeks' && (pathname === item.href || pathname.startsWith('/weeks/') && !pathname.startsWith('/weeks/my-week') && !pathname.startsWith('/weeks/tasks'))) {
                                                        isActive = true;
                                                    } else if (item.href === '/weeks/tasks') {
                                                        isActive = pathname === item.href;
                                                    } else if (item.href === '/sessions') {
                                                        isActive = pathname.startsWith('/sessions') || pathname.startsWith('/classes');
                                                    } else {
                                                        isActive = pathname.startsWith(item.href);
                                                    }
                                                    return (
                                                         <SheetClose asChild key={item.href}>
                                                            <Link
                                                                href={item.href}
                                                                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", isActive ? "bg-muted text-primary" : "")}
                                                            >
                                                                <item.icon className="h-4 w-4" />
                                                                <span>{label}</span>
                                                            </Link>
                                                        </SheetClose>
                                                    )
                                                })}
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
                                ))}
                            </Accordion>
                        </nav>
                         <div className="mt-auto border-t p-2 -ml-6 -mb-6">
                            <div className="flex items-center gap-3 p-2">
                                <Avatar className="size-9">
                                <AvatarImage src={userImage} alt={user.name} className="object-cover" />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <p className="text-sm font-medium">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{getActiveRole(pathname)}</p>
                                </div>
                            </div>
                            <SheetClose asChild>
                                <Button variant="ghost" className="w-full justify-start" onClick={logout}>
                                    <LogOut className="h-5 w-5 mr-3" />
                                    <span>Cerrar Sesión</span>
                                </Button>
                            </SheetClose>
                        </div>
                    </SheetContent>
                </Sheet>
                 <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <Flame className="h-6 w-6 text-primary" />
                    <span className="font-headline">SMA</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={logout}>
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Cerrar Sesión</span>
                </Button>
            </div>
        </header>
    );
}
