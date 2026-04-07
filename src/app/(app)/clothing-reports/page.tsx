
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";
import { ClothingItem, Firefighter } from "@/lib/types";
import { getClothingItems } from "@/services/clothing.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Download, Loader2, Filter, Shirt, Shield, Tag, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { APP_CONFIG } from "@/lib/config";

const firehouses = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
const clothingStates: ClothingItem['state'][] = ['Nuevo', 'Bueno', 'Regular', 'Malo', 'Baja'];

const CONDITION_CHART_COLORS: Record<string, string> = {
    Nuevo: "#3B82F6",
    Bueno: "#22C55E",
    Regular: "#FBBF24",
    Malo: "#F97316",
    Baja: "#EF4444",
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (!percent || percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[11px] font-bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export default function ClothingReportsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
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
        fetch(APP_CONFIG.logoUrl).then(r => r.blob()).then(b => {
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
        if (!logoDataUrl) return;
        setGeneratingPdf(true);
        const doc = new jsPDF();
        try {
            doc.setFillColor(220, 53, 69);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
            doc.text(`Inventario de Ropería - ${APP_CONFIG.name}`, 14, 22);
            doc.addImage(logoDataUrl, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25);
            
            (doc as any).autoTable({
                startY: 45,
                head: [['Código', 'Tipo', 'Talle', 'Asignado a', 'Estado']],
                body: filteredItems.map(i => [
                    i.code, i.type, i.size, 
                    i.firefighter ? `${i.firefighter.legajo} - ${i.firefighter.lastName}, ${i.firefighter.firstName}` : 'En Depósito',
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
            <Card className="shadow-md">
                <CardHeader className="bg-muted/30 border-b"><CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5 text-primary" /> Filtros Operativos</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold">Integrante</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild disabled={isBomberoRole}>
                                <Button variant="outline" className="w-full justify-between h-10 overflow-hidden text-xs text-left">
                                    <span className="truncate">{filterFirefighter !== 'all' ? allFirefighters.find(f => f.id === filterFirefighter)?.lastName : "Todos"}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Buscar..." />
                                    <CommandList>
                                        <CommandEmpty>No encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem onSelect={() => { setFilterFirefighter('all'); setOpenCombobox(false); }}>Todos</CommandItem>
                                            {allFirefighters.map(f => (
                                                <CommandItem key={f.id} value={`${f.legajo} ${f.lastName} ${f.firstName}`} onSelect={() => { setFilterFirefighter(f.id); setOpenCombobox(false); }}>
                                                    {f.legajo} - {f.lastName}, {f.firstName}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2"><Label className="text-xs font-bold">Tipo de Prenda</Label><Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Todos"/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{clothingTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-xs font-bold">Ubicación</Label><Select value={filterCuartel} onValueChange={setFilterCuartel}><SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Cualquiera"/></SelectTrigger><SelectContent><SelectItem value="all">Cualquiera</SelectItem>{firehouses.map(fh => <SelectItem key={fh} value={fh}>{fh}</SelectItem>)}<SelectItem value="En Depósito">En Depósito</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-xs font-bold">Estado</Label><Select value={filterState} onValueChange={setFilterState}><SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Cualquiera"/></SelectTrigger><SelectContent><SelectItem value="all">Cualquiera</SelectItem>{clothingStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 shadow-md overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b">
                        <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><Shirt className="h-4 w-4" /> Distribución por Estado</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72 pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={summaryStats.pieData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={90} 
                                    innerRadius={35}
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    strokeWidth={2}
                                >
                                    {summaryStats.pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2 shadow-md">
                    <CardHeader className="bg-muted/20 border-b">
                        <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><Tag className="h-4 w-4" /> Vista Previa ({filteredItems.length} items)</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">Código</TableHead>
                                    <TableHead className="text-xs">Tipo</TableHead>
                                    <TableHead className="text-xs">Asignado a</TableHead>
                                    <TableHead className="text-right text-xs">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono text-[10px] font-bold">{item.code}</TableCell>
                                        <TableCell className="text-xs font-medium">{item.type}</TableCell>
                                        <TableCell className="text-[10px]">{item.firefighter ? `${item.firefighter.lastName}, ${item.firefighter.firstName}` : 'Depósito'}</TableCell>
                                        <TableCell className="text-right"><Badge variant="outline" className="text-[9px] h-5">{item.state}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter className="pt-4 border-t bg-muted/10">
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
