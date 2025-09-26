'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { navItems } from "../layout";
import { UserRole } from "@/lib/types";

interface BottomNavProps {
    navItems: typeof navItems;
    userRole: UserRole;
}

export default function BottomNav({ navItems, userRole }: BottomNavProps) {
    const pathname = usePathname();
    const availableNavItems = navItems.filter(item => item.roles.includes(userRole));

    const getLabel = (item: typeof navItems[0]) => {
        if (item.href === '/reports' && userRole === 'Bombero') {
            return 'Mi Reporte';
        }
        return item.label;
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm md:hidden">
            <div className="grid h-16 grid-cols-5 items-center justify-items-center">
                {availableNavItems.slice(0, 5).map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1 text-muted-foreground",
                            pathname.startsWith(item.href) ? "text-primary" : "hover:text-primary"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[10px] font-medium">{getLabel(item)}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}