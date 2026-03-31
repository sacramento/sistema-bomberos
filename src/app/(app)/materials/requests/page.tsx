
'use client';

import { PageHeader } from "@/components/page-header";
import MaterialRequestsList from "../_components/material-requests-list";
import { useAuth } from "@/context/auth-context";

export default function MaterialRequestsPage() {
    const { user } = useAuth();

    return (
        <>
            <PageHeader 
                title="Solicitudes de Cambio" 
                description="Revise y autorice los movimientos de materiales propuestos por los encargados."
            />
            
            <div className="space-y-6">
                <MaterialRequestsList onDataChange={() => {}} actor={user} />
            </div>
        </>
    );
}
