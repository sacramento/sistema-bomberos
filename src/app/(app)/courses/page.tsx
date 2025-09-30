
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import AddCourseDialog from "./_components/add-course-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CourseList from "./_components/course-list";
import CourseReport from "./_components/course-report";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";

export default function CoursesPage() {
    const [refreshSignal, setRefreshSignal] = useState(false);
    const { getActiveRole } = useAuth();
    const pathname = usePathname();

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Ayudantía', [activeRole]);

    const handleDataChange = () => {
        setRefreshSignal(prev => !prev);
    };

    return (
        <>
            <PageHeader title="Gestión de Cursos Externos" description="Registre y genere reportes de las capacitaciones individuales de los bomberos.">
                {canManage && (
                    <AddCourseDialog onCourseAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Registrar Curso
                        </Button>
                    </AddCourseDialog>
                )}
            </PageHeader>

             <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-4">
                    <TabsTrigger value="list">Listado de Cursos</TabsTrigger>
                    <TabsTrigger value="reports">Reportes</TabsTrigger>
                </TabsList>
                
                <TabsContent value="list">
                    <CourseList refreshSignal={refreshSignal} onDataChange={handleDataChange} canManage={canManage}/>
                </TabsContent>
                
                <TabsContent value="reports">
                    <CourseReport />
                </TabsContent>
            </Tabs>
        </>
    )
}
