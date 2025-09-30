'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { navItems } from "../layout";
import { ModuleRole } from "@/lib/types";
import { LogOut, Flame } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";

interface TopNavProps {
    navItems: typeof navItems;
    userRole: ModuleRole | 'Administrador' | 'Ninguno';
}

export default function TopNav({ navItems, userRole }: TopNavProps) {
    const pathname = usePathname();
    const { logout } = useAuth();
    const availableNavItems = navItems.filter(item => item.roles.includes(userRole));

    const getLabel = (item: typeof navItems[0]) => {
        if (item.href === '/reports' && userRole === 'Bombero') {
            return 'Mi Reporte';
        }
        return item.label;
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur-sm md:hidden">
            <div className="flex h-16 items-center justify-between px-4">
                 <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <Flame className="h-6 w-6 text-primary" />
                    <span className="font-headline">SMA</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={logout}>
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Cerrar Sesión</span>
                </Button>
            </div>
            <div className="flex h-12 items-center justify-start gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap px-4">
                {availableNavItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1 text-muted-foreground px-2 py-1 rounded-md",
                            pathname.startsWith(item.href) ? "text-primary bg-muted" : "hover:text-primary"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{getLabel(item)}</span>
                    </Link>
                ))}
            </div>
        </header>
    );
}
