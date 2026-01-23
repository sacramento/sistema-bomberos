
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import QrScannerDialog from '@/app/(app)/materials/_components/qr-scanner-dialog'; // Reusing this one
import { QrCode, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { addCascadeCharge, getCascadeCharges, addCascadeSystemCharge } from '@/services/cascade.service';
import { CascadeCharge, CascadeSystemCharge } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const cascadeTubes = ['Tubo 1', 'Tubo 2', 'Tubo 3', 'Tubo 4'] as const;

export default function CascadePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    // State for ERA Tube Charges
    const [loading, setLoading] = useState(false);
    const [recentCharges, setRecentCharges] = useState<CascadeCharge[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [manualCode, setManualCode] = useState('');

    // State for Cascade System Charges
    const [selectedTubes, setSelectedTubes] = useState<string[]>([]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isSubmittingSystem, setIsSubmittingSystem] = useState(false);


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
    
    const handleSystemChargeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { 
            toast({ variant: 'destructive', title: "Error de autenticación", description: "Debe iniciar sesión." });
            return; 
        }
        if (selectedTubes.length === 0 || !startTime || !endTime) {
            toast({ variant: 'destructive', title: "Error", description: "Todos los campos son obligatorios para la carga de cascada." });
            return;
        }

        setIsSubmittingSystem(true);
        try {
            await addCascadeSystemCharge({
                tubes: selectedTubes as any,
                startTime,
                endTime,
                cuartel: 'Cuartel 1',
            }, user);
            toast({ title: "¡Éxito!", description: `Se registró la carga de la cascada.` });
            // reset form
            setSelectedTubes([]);
            setStartTime('');
            setEndTime('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error al registrar", description: error.message });
        } finally {
            setIsSubmittingSystem(false);
        }
    };

    return (
        <>
            <PageHeader title="Carga de Cascada" description="Registre cargas de tubos ERA individuales o del sistema de cascada completo." />
            
            <Tabs defaultValue="tubos" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tubos">Carga de Tubos ERA</TabsTrigger>
                    <TabsTrigger value="cascada">Carga de Sistema Cascada</TabsTrigger>
                </TabsList>
                
                <TabsContent value="tubos" className="space-y-8 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Registrar Carga de Tubo ERA</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-grow flex gap-2">
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
                                </div>
                                <Separator orientation="vertical" className="mx-2 hidden sm:block"/>
                                <QrScannerDialog onScan={handleQrScan}>
                                    <Button size="lg" variant="outline" className="w-full sm:w-auto h-12" disabled={isSubmitting}>
                                        <QrCode className="mr-2 h-4 w-4" />
                                        Escanear QR
                                    </Button>
                                </QrScannerDialog>
                            </form>
                            <p className="text-sm text-muted-foreground mt-4">Al registrar, la fecha y hora actuales se guardarán automáticamente.</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Últimas Cargas de Tubos</CardTitle>
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
                </TabsContent>
                
                <TabsContent value="cascada" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Registrar Carga del Sistema</CardTitle>
                            <CardDescription>Seleccione los tubos de la cascada y las fechas de inicio y fin de la carga.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSystemChargeSubmit}>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Tubos Cargados</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {cascadeTubes.map(tube => (
                                            <div key={tube} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={tube}
                                                    checked={selectedTubes.includes(tube)}
                                                    onCheckedChange={(checked) => {
                                                        setSelectedTubes(prev => checked ? [...prev, tube] : prev.filter(t => t !== tube));
                                                    }}
                                                />
                                                <label htmlFor={tube} className="text-sm font-medium leading-none">{tube}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="startTime">Fecha y Hora de Inicio</Label>
                                        <Input id="startTime" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} required/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endTime">Fecha y Hora de Finalización</Label>
                                        <Input id="endTime" type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} required/>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={isSubmittingSystem}>
                                    {isSubmittingSystem && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Registrar Carga de Cascada
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
    );
}
