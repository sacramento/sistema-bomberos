import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function LeavesPage() {
    return (
        <>
            <PageHeader title="Leave Management" description="Record and manage firefighter leaves.">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Record Leave
                </Button>
            </PageHeader>
            <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Leave management table will be displayed here.</p>
            </div>
        </>
    )
}
