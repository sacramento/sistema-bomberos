
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import AddAspiranteCourseDialog from "./_components/add-course-dialog";
import AspiranteCourseList from "./_components/course-list";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";

export default function AspiranteCoursesPage() {
    const [refreshSignal, setRefreshSignal] = useState(false);
    const { getActiveRole } = useAuth();
    const pathname = usePathname();

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Oficial', [activeRole]);

    const handleDataChange = () => {
        setRefreshSignal(prev => !prev);
    };

    return (
        <>
            <PageHeader title="Cursos de Aspirantes" description="Registre y gestione las capacitaciones externas de los aspirantes.">
                {canManage && (
                    <AddAspiranteCourseDialog onCourseAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Registrar Curso
                        </Button>
                    </AddAspiranteCourseDialog>
                )}
            </PageHeader>
            
            <AspiranteCourseList refreshSignal={refreshSignal} onDataChange={handleDataChange} canManage={canManage}/>
        </>
    )
}
