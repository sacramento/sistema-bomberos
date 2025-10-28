
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import AddCourseDialog from "./_components/add-course-dialog";
import CourseList from "./_components/course-list";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";

export default function CoursesPage() {
    const [refreshSignal, setRefreshSignal] = useState(false);
    const { getActiveRole } = useAuth();
    const pathname = usePathname();

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

    const handleDataChange = () => {
        setRefreshSignal(prev => !prev);
    };

    return (
        <>
            <PageHeader title="Gestión de Cursos Externos" description="Registre y gestione las capacitaciones individuales de los bomberos.">
                {canManage && (
                    <AddCourseDialog onCourseAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Registrar Curso
                        </Button>
                    </AddCourseDialog>
                )}
            </PageHeader>
            
            <CourseList refreshSignal={refreshSignal} onDataChange={handleDataChange} canManage={canManage}/>
        </>
    )
}
