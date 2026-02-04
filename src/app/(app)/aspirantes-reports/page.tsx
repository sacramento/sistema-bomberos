'use client';

import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassesReportTab, WorkshopsReportTab, CoursesReportTab } from '../reports/page'; // Re-using components from main reports

export default function AspiranteReportsPage() {
    const { getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);
    const isBomberoRole = activeRole === 'Bombero';

    return (
      <>
        <PageHeader title={isBomberoRole ? 'Mi Reporte de Aspirante' : 'Reportes de Aspirantes'} description="Genere y exporte reportes de asistencia y actividad de los aspirantes." />
        <Tabs defaultValue="clases" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto mb-6">
                <TabsTrigger value="clases">Clases</TabsTrigger>
                <TabsTrigger value="talleres">Talleres</TabsTrigger>
                <TabsTrigger value="cursos">Cursos</TabsTrigger>
            </TabsList>
            <TabsContent value="clases">
                <ClassesReportTab context="aspirantes" />
            </TabsContent>
            <TabsContent value="talleres">
                <WorkshopsReportTab context="aspirantes" />
            </TabsContent>
            <TabsContent value="cursos">
                <CoursesReportTab context="aspirantes" />
            </TabsContent>
        </Tabs>
      </>
    );
}
