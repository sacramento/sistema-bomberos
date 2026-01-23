'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import QrScannerDialog from '@/app/(app)/materials/_components/qr-scanner-dialog'; // Reusing this one
import { QrCode, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { addCascadeCharge, getCascadeCharges } from '@/services/cascade.service';
import { CascadeCharge } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export default function CascadePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [recentCharges, setRecentCharges] = useState<CascadeCharge[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [manualCode, setManualCode] = useState('');

    const fetchRecentCharges = async () => {
        setLoading(true);
        try {
            const charges = await getCascadeCharges();
            setRecentCharges(charges.slice(0, 10)); // Show last 10
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar los registros recientes." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecentCharges();
    }, [toast]);

    const handleRegisterCharge = async (code: string) => {
        if (!user) {
            toast({ variant: 'destructive', title: "Error", description: "Debe iniciar sesión para registrar una carga." });
            return;
        }
        if (!code.trim()) {
            toast({ variant: 'destructive', title: "Error", description: "El código del tubo no puede estar vacío." });
            return;
        }

        setIsSubmitting(true);
        try {
            await addCascadeCharge(code.trim(), user);
            toast({ title: "¡Éxito!", description: `Se registró la carga para el tubo con código: ${code.trim()}` });
            fetchRecentCharges(); // Refresh the list
            setManualCode(''); // Clear input
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error al registrar", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQrScan = (code: string) => {
        setManualCode(code);
        handleRegisterCharge(code);
    };

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleRegisterCharge(manualCode);
    }

    return (
        <>
            <PageHeader title="Carga de Cascada" description="Escanee o ingrese el código de un tubo de ERA para registrar su carga." />
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="font-headline">Registrar Carga</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <form onSubmit={handleFormSubmit} className="flex-grow flex gap-2">
                             <Input 
                                placeholder="Ingresar código manualmente"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                className="h-12 text-base"
                            />
                            <Button type="submit" size="lg" className="h-12" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Registrar
                            </Button>
                        </form>
                        <Separator orientation="vertical" className="mx-2 hidden sm:block"/>
                        <QrScannerDialog onScan={handleQrScan}>
                             <Button size="lg" variant="outline" className="w-full sm:w-auto h-12" disabled={isSubmitting}>
                                <QrCode className="mr-2 h-4 w-4" />
                                Escanear QR
                            </Button>
                        </QrScannerDialog>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">Al registrar, la fecha y hora actuales se guardarán automáticamente.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Últimas Cargas Registradas</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código de Tubo</TableHead>
                                <TableHead>Fecha y Hora de Carga</TableHead>
                                <TableHead>Cuartel</TableHead>
                                <TableHead>Registrado por</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                ))
                            ) : recentCharges.length > 0 ? (
                                recentCharges.map(charge => (
                                    <TableRow key={charge.id}>
                                        <TableCell className="font-mono">{charge.materialCode}</TableCell>
                                        <TableCell>{format(parseISO(charge.chargeTimestamp), 'Pp', { locale: es })}</TableCell>
                                        <TableCell>{charge.cuartel}</TableCell>
                                        <TableCell>{charge.actorName}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay cargas registradas.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
