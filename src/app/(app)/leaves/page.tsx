import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function LeavesPage() {
    return (
        <>
            <PageHeader title="Gestión de Licencias" description="Registre y gestione las licencias de los bomberos.">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Registrar Licencia
                </Button>
            </PageHeader>
            <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">La tabla de gestión de licencias se mostrará aquí.</p>
            </div>
        </>
    )
}
