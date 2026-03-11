
'use client';

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassesReportTab, WorkshopsReportTab, CoursesReportTab } from "@/components/report-tabs";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";

export default function ReportsPage() {
    const { getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);
    const isBomberoRole = activeRole === 'Bombero';

    return (
      <>
        <PageHeader title={isBomberoRole ? 'Mi Reporte' : 'Reportes'} description="Genere y exporte reportes de asistencia y actividad." />
        <Tabs defaultValue="clases" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto mb-6">
                <TabsTrigger value="clases">Clases</TabsTrigger>
                <TabsTrigger value="talleres">Talleres</TabsTrigger>
                <TabsTrigger value="cursos">Cursos</TabsTrigger>
            </TabsList>
            <TabsContent value="clases">
                <ClassesReportTab context="asistencia" />
            </TabsContent>
            <TabsContent value="talleres">
                <WorkshopsReportTab context="asistencia" />
            </TabsContent>
            <TabsContent value="cursos">
                <CoursesReportTab context="asistencia" />
            </TabsContent>
        </Tabs>
      </>
    );
}
