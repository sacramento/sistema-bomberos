
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardMinus, Gavel, UserX, Package, ShieldCheck, Activity } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Leave, Sanction, GeneralInventoryItem } from "@/lib/types";
import { getLeaves } from "@/services/leaves.service";
import { getSanctions } from "@/services/sanctions.service";
import { getGeneralInventory } from "@/services/general-inventory.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { parseISO, isWithinInterval } from "date-fns";

const PIE_COLORS = ["#3B82F6", "#EF4444", "#FBBF24", "#22C55E", "#8B5CF6"];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (!percent || percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export default function AyudantiaReportsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ leaves: Leave[], sanctions: Sanction[], inventory: GeneralInventoryItem[] }>({ leaves: [], sanctions: [], inventory: [] });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [l, s, i] = await Promise.all([getLeaves(), getSanctions(), getGeneralInventory()]);
                setData({ leaves: l, sanctions: s, inventory: i });
            } catch (error) {
                toast({ title: "Error", description: "Fallo al cargar dashboard." });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    const stats = useMemo(() => {
        const today = new Date();
        const activeLeaves = data.leaves.filter(l => isWithinInterval(today, { start: parseISO(l.startDate), end: parseISO(l.endDate) })).length;
        const inServiceItems = data.inventory.filter(i => i.estado === 'En Servicio').length;
        
        const inventoryByCond = data.inventory.reduce((acc, i) => { acc[i.condicion] = (acc[i.condicion] || 0) + 1; return acc; }, {} as any);
        const pieData = Object.entries(inventoryByCond).map(([name, value]) => ({ name, value }));

        return { activeLeaves, totalSanctions: data.sanctions.length, inServiceItems, pieData };
    }, [data]);

    if (loading) return <Skeleton className="h-full w-full" />;

    return (
        <div className="space-y-8">
            <PageHeader title="Dashboard Ayudantía" description="Resumen consolidado de personal y bienes de uso." />
            
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Personal de Licencia</CardTitle></CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <UserX className="h-8 w-8 text-blue-500" />
                        <div className="text-2xl font-bold">{stats.activeLeaves} integrantes</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Sanciones Activas</CardTitle></CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <Gavel className="h-8 w-8 text-red-500" />
                        <div className="text-2xl font-bold">{stats.totalSanctions} registros</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Operatividad de Bienes</CardTitle></CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <Activity className="h-8 w-8 text-green-500" />
                        <div className="text-2xl font-bold">{stats.inServiceItems} en servicio</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Condición General del Inventario</CardTitle></CardHeader>
                <CardContent>
                    <ChartContainer config={{}} className="h-80">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie 
                                    data={stats.pieData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={100} 
                                    innerRadius={50}
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                >
                                    {stats.pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Pie>
                                <Legend />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}
