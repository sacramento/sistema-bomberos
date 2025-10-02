
'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function PortalPage() {
  // This page is now a loading fallback. 
  // The primary redirection logic is in AuthContext and the main layout.
  // This prevents users from ever seeing a "unified platform" page.
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4">
        <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <p className="text-center text-muted-foreground mt-4">Redirigiendo a su dashboard...</p>
        </div>
    </div>
  );
}
