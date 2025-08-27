import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ReportsPage() {
    return (
        <>
            <PageHeader title="Reportes" description="Genere y exporte reportes de asistencia y actividad.">
                <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Generar Reporte
                </Button>
            </PageHeader>
            <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">El formulario de generación de reportes y los resultados se mostrarán aquí.</p>
            </div>
        </>
    )
}
