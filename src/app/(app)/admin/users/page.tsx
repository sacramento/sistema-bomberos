import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function UsersPage() {
    return (
        <>
            <PageHeader title="Administración de Usuarios" description="Gestionar cuentas de usuario y roles.">
                 <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Usuario
                </Button>
            </PageHeader>
            <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">La tabla de gestión de usuarios se mostrará aquí.</p>
            </div>
        </>
    )
}
