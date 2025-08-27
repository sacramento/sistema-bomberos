import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ReportsPage() {
    return (
        <>
            <PageHeader title="Reporting" description="Generate and export attendance and activity reports.">
                <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Generate Report
                </Button>
            </PageHeader>
            <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Report generation form and results will be displayed here.</p>
            </div>
        </>
    )
}
