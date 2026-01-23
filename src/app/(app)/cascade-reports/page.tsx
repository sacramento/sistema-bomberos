
'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { getCascadeCharges } from '@/services/cascade.service';
import { getMaterials } from '@/services/materials.service';
import { CascadeCharge, Material } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts";

const cuarteles = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
const PIE_CHART_COLORS: Record<string, string> = {
    'Cuartel 1': "#facc15", // yellow-400
    'Cuartel 2': "#3b82f6", // blue-500
    'Cuartel 3': "#22c55e", // green-500
};

export default function CascadeReportsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [allCharges, setAllCharges] = useState<CascadeCharge[]>([]);
    const [allMaterials, setAllMaterials] = useState<Material[]>([]);

    // Filters
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterCuartel, setFilterCuartel] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [chargesData, materialsData] = await Promise.all([
                    getCascadeCharges(),
                    getMaterials()
                ]);
                setAllCharges(chargesData);
                setAllMaterials(materialsData.filter(m => m.tipo === 'RESPIRACIÓN'));
            } catch (error) {
                toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [toast]);
    
    const filteredCharges = useMemo(() => {
        return allCharges.filter(charge => {
            if (filterCuartel !== 'all' && charge.cuartel !== filterCuartel) return false;
            
            if (filterDate?.from) {
                const chargeDate = parseISO(charge.chargeTimestamp);
                const toDate = filterDate.to ?? filterDate.from;
                if (!isWithinInterval(chargeDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return false;
            }
            return true;
        });
    }, [allCharges, filterDate, filterCuartel]);
    
    const reportData = useMemo(() => {
        const chargesByTube = filteredCharges.reduce((acc, charge) => {
            acc[charge.materialCode] = (acc[charge.materialCode] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const chargesByCuartel = filteredCharges.reduce((acc, charge) => {
            acc[charge.cuartel] = (acc[charge.cuartel] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const pieData = Object.entries(chargesByCuartel).map(([name, value]) => ({
            name,
            value,
            fill: PIE_CHART_COLORS[name] || '#ccc'
        }));

        const tableData = allMaterials.map(material => ({
            code: material.codigo,
            cuartel: material.cuartel,
            chargeCount: chargesByTube[material.codigo] || 0,
        })).filter(item => item.chargeCount > 0)
         .sort((a,b) => b.chargeCount - a.chargeCount);
        
        return { tableData, pieData, totalCharges: filteredCharges.length };
    }, [filteredCharges, allMaterials]);

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent === 0) return null;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill={'#fff'} textAnchor="middle" dominantBaseline="central" className="text-base font-bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="space-y-8">
            <PageHeader title="Reportes de Cascada" description="Estadísticas de uso y recarga de equipos de respiración." />
            
            <Card>
                 <CardHeader>
                    <CardTitle className="font-headline">Filtros del Reporte</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Rango de Fechas</Label>
                        <Popover>
                            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !filterDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filterDate?.from ? (filterDate.to ? (<>{format(filterDate.from, "LLL dd, y", { locale: es })} - {format(filterDate.to, "LLL dd, y", { locale: es })}</>) : (format(filterDate.from, "LLL dd, y", { locale: es }))) : (<span>Todos</span>)}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={filterDate?.from} selected={filterDate} onSelect={setFilterDate} numberOfMonths={2} locale={es} /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Cuartel</Label>
                        <Select value={filterCuartel} onValueChange={setFilterCuartel}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Cuarteles</SelectItem>
                                {cuarteles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Cargas por Cuartel</CardTitle>
                            <CardDescription>Total de cargas: {reportData.totalCharges}</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ChartContainer config={{}} className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                        <Pie data={reportData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={100} innerRadius={60}>
                                            {reportData.pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                                        </Pie>
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Detalle de Cargas por Tubo</CardTitle>
                        </CardHeader>
                        <CardContent className="max-h-[400px] overflow-y-auto">
                            <Table>
                                <TableHeader><TableRow><TableHead>Tubo (Código)</TableHead><TableHead>Cuartel</TableHead><TableHead>Nº de Cargas</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-5 w-full" /></TableCell></TableRow>))
                                    ) : reportData.tableData.length > 0 ? (
                                        reportData.tableData.map((item) => (
                                            <TableRow key={item.code}>
                                                <TableCell className="font-mono font-medium">{item.code}</TableCell>
                                                <TableCell>{item.cuartel}</TableCell>
                                                <TableCell className="font-bold">{item.chargeCount}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={3} className="h-24 text-center">No se encontraron registros de carga con los filtros aplicados.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
