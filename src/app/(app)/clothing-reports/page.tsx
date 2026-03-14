
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";
import { ClothingItem, Firefighter, ClothingCategory, ClothingSubCategory } from "@/lib/types";
import { getClothingItems } from "@/services/clothing.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Archive, User, Shirt, Download, Loader2, FileSignature } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

const firehouses = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
const clothingStates: ClothingItem['state'][] = ['Nuevo', 'Bueno', 'Regular', 'Malo', 'Baja'];

const CONDITION_CHART_COLORS: Record<string, string> = {
    Nuevo: "#3B82F6",
    Bueno: "#22C55E",
    Regular: "#FBBF24",
    Malo: "#F97316",
    Baja: "#EF4444",
};

export default function ClothingReportsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [generatingFicha, setGeneratingFicha] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    const [allItems, setAllItems] = useState<ClothingItem[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);

    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterCuartel, setFilterCuartel] = useState('all');
    const [filterState, setFilterState] = useState('all');
    const [openCombobox, setOpenCombobox] = useState(false);

    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);
    const isBomberoRole = activeRole === 'Bombero';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [itemsData, firefightersData] = await Promise.all([
                    getClothingItems(),
                    getFirefighters()
                ]);
                setAllItems(itemsData);
                setAllFirefighters(firefightersData);

                if (isBomberoRole && user) {
                    const firefighterUser = firefightersData.find(f => f.legajo === user.id);
                    if(firefighterUser) setFilterFirefighter(firefighterUser.id);
                }
            } catch (error) {
                toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        fetch('https://i.ibb.co/yF0SYDNF/logo.png').then(r => r.blob()).then(b => {
            const reader = new FileReader();
            reader.onloadend = () => setLogoDataUrl(reader.result as string);
            reader.readAsDataURL(b);
        });
    }, [toast, user, isBomberoRole]);

    const clothingTypes = useMemo(() => {
        const types = new Set(allItems.map(i => i.type));
        return Array.from(types).sort();
    }, [allItems]);

    const filteredItems = useMemo(() => {
        return allItems.filter(item => {
            if (filterType !== 'all' && item.type !== filterType) return false;
            if (filterState !== 'all' && item.state !== filterState) return false;
            if (filterFirefighter !== 'all' && item.firefighterId !== filterFirefighter) return false;
            if (filterCuartel !== 'all') {
                if (filterCuartel === 'En Depósito') {
                    if (item.firefighterId) return false;
                } else {
                    const f = allFirefighters.find(f => f.id === item.firefighterId);
                    if (!f || f.firehouse !== filterCuartel) return false;
                }
            }
            return true;
        });
    }, [allItems, allFirefighters, filterType, filterState, filterFirefighter, filterCuartel]);

    const summaryStats = useMemo(() => {
        const counts = filteredItems.reduce((acc, item) => {
            acc[item.state] = (acc[item.state] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return {
            total: filteredItems.length,
            deposit: filteredItems.filter(i => !i.firefighterId).length,
            assigned: filteredItems.filter(i => !!i.firefighterId).length,
            pieData: Object.entries(counts).map(([name, value]) => ({
                name, value, fill: CONDITION_CHART_COLORS[name] || '#ccc'
            }))
        }
    }, [filteredItems]);

    const generateGeneralPdf = async () => {
        setGeneratingPdf(true);
        const doc = new jsPDF();
        try {
            doc.setFillColor(220, 53, 69);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
            doc.text("Reporte de Ropería", 14, 22);
            if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25);
            
            (doc as any).autoTable({
                startY: 45,
                head: [['Código', 'Tipo', 'Talle', 'Asignado a', 'Estado']],
                body: filteredItems.map(i => [
                    i.code, i.type, i.size, 
                    i.firefighter ? `${i.firefighter.legajo} - ${i.firefighter.lastName}` : 'En Depósito',
                    i.state
                ]),
                theme: 'striped', headStyles: { fillColor: '#333' }
            });
            doc.save(`reporte-roperia-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingPdf(false); }
    }

    if (loading) return <Skeleton className="w-full h-[600px]" />;

    return (
        <div className="space-y-8">
            <PageHeader title={isBomberoRole ? "Mi Ropería" : "Informes de Ropería"} description="Análisis de stock y asignaciones de equipo personal." />
            
            <Card>
                <CardHeader><CardTitle className="text-lg">Filtros</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label>Bombero</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild disabled={isBomberoRole}>
                                <Button variant="outline" className="w-full justify-between h-10 overflow-hidden">
                                    <span className="truncate">{filterFirefighter !== 'all' ? allFirefighters.find(f => f.id === filterFirefighter)?.lastName : "Todos"}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar..." />
                                    <CommandList>
                                        <CommandEmpty>No encontrado.</CommandEmpty>
                                        <CommandItem onSelect={() => { setFilterFirefighter('all'); setOpenCombobox(false); }}>Todos</CommandItem>
                                        {allFirefighters.map(f => (
                                            <CommandItem key={f.id} onSelect={() => { setFilterFirefighter(f.id); setOpenCombobox(false); }}>
                                                {f.legajo} - {f.lastName}
                                            </CommandItem>
                                        ))}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Tipo de Prenda</Label>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {clothingTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Ubicación</Label>
                        <Select value={filterCuartel} onValueChange={setFilterCuartel}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Cualquiera</SelectItem>
                                {firehouses.map(fh => <SelectItem key={fh} value={fh}>{fh}</SelectItem>)}
                                <SelectItem value="En Depósito">En Depósito</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select value={filterState} onValueChange={setFilterState}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Cualquiera</SelectItem>
                                {clothingStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                    <CardHeader><CardTitle className="text-base">Estado del Equipo</CardTitle></CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="h-64">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={summaryStats.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                                        {summaryStats.pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                    </Pie>
                                    <Legend />
                                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="text-base">Vista Previa ({filteredItems.length} items)</CardTitle></CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto">
                        <Table>
                            <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono text-xs">{item.code}</TableCell>
                                        <TableCell className="text-sm font-medium">{item.type}</TableCell>
                                        <TableCell><Badge variant="outline" className="text-[10px]">{item.state}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter className="pt-4">
                        <Button onClick={generateGeneralPdf} disabled={generatingPdf || filteredItems.length === 0}>
                            {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                            Exportar Listado PDF
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
