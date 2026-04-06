
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useEffect, useState, useMemo } from 'react';
import { Firefighter, Session, AttendanceStatus, Specialization } from '@/lib/types';
import { getFirefighters } from '@/services/firefighters.service';
import { getAspiranteSessions } from '@/services/aspirantes-sessions.service';
import { getAspiranteWorkshops } from '@/services/aspirantes-workshops.service';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const PIE_CHART_COLORS: Record<string, string> = {
    presente: "#22C55E", // green-500
    ausente: "#EF4444", // red-500
    tarde: "#FBBF24",   // yellow-400
    excused: "#8B5CF6",
    recupero: "#3B82F6",
};

type AttendanceSummary = {
    present: number;
    absent: number;
    tardy: number;
    recupero: number;
    excused: number;
    totalForPercentage: number;
    presentPercentage: number;
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


export default function AspirantesDashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [firefightersData, sessionsData, workshopsData] = await Promise.all([
          getFirefighters(),
          getAspiranteSessions(),
          getAspiranteWorkshops(),
        ]);
        setFirefighters(firefightersData);
        setSessions([...sessionsData, ...workshopsData]);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
        toast({ title: "Error", description: "No se pudieron cargar los datos del dashboard.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

 const attendanceDataByGroup = useMemo(() => {
    const firefighterMap = new Map(firefighters.map(f => [f.id, f]));

    let allRecords: { status: AttendanceStatus; firefighter: Firefighter; session: Session }[] = [];
    sessions.forEach(session => {
        if(!session.attendance) return;
        
        // En el dashboard de aspirantes, solo computamos la asistencia de los alumnos (Aspirantes)
        const participantIds = new Set(Object.keys(session.attendance));

        participantIds.forEach(id => {
            const firefighter = firefighterMap.get(id);
            if (!firefighter || firefighter.rank !== 'ASPIRANTE') return;

            const status = session.attendance![id];
            if (status) {
                allRecords.push({ status, firefighter, session });
            }
        });
    });
    
    const processAttendance = (records: typeof allRecords): AttendanceSummary => {
        const counts = records.reduce((acc, record) => {
            acc[record.status] = (acc[record.status] || 0) + 1;
            return acc;
        }, {} as Record<AttendanceStatus, number>);

        const present = counts.present || 0;
        const absent = counts.absent || 0;
        const tardy = counts.tardy || 0;
        const recupero = counts.recupero || 0;
        const excused = counts.excused || 0;
        
        const totalForPercentage = present + tardy + absent + excused;
        const effectiveAttendance = present + (tardy * 0.6) + recupero;
        const presentPercentage = totalForPercentage > 0 ? Math.min(100, (effectiveAttendance / totalForPercentage) * 100) : 0;
      
        return { present, absent, tardy, recupero, excused, totalForPercentage, presentPercentage };
    };

    const groupedData: Record<string, AttendanceSummary> = {
        'General': processAttendance(allRecords)
    };

    const specializations = new Set(allRecords.map(r => r.session.specialization));
    specializations.forEach(spec => {
        groupedData[spec] = processAttendance(allRecords.filter(r => r.session.specialization === spec));
    });

    return groupedData;
  }, [sessions, firefighters]);

  const specializationsWithData = Object.keys(attendanceDataByGroup).filter(key => 
    !['General'].includes(key) && attendanceDataByGroup[key]?.totalForPercentage > 0
  );
  
  if (loading) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

  const renderChart = (title: string, data: AttendanceSummary) => {
    const hasData = data && data.totalForPercentage > 0;
    const pieData = hasData ? [
        { name: "Presente", value: data.present + data.recupero, fill: PIE_CHART_COLORS.presente },
        { name: "Ausente", value: data.absent + data.excused, fill: PIE_CHART_COLORS.ausente },
        { name: "Tarde", value: data.tardy, fill: PIE_CHART_COLORS.tarde },
      ].filter(d => d.value > 0) : [];

    return (
        <Card className="flex flex-col overflow-hidden shadow-sm">
             <CardHeader className="items-center pb-2 bg-muted/20 border-b">
                <CardTitle className="font-headline text-lg text-center">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
                {hasData ? (
                    <ChartContainer config={{}} className="mx-auto aspect-square h-full w-full max-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-muted-foreground">{payload[0].name}</span>
                                                        <span className="font-bold">{payload[0].value}</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Pie
                                  data={pieData}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={35}
                                  outerRadius={90}
                                  strokeWidth={2}
                                  labelLine={false}
                                  label={renderCustomizedLabel}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-muted-foreground italic border-2 border-dashed rounded-lg w-full">
                        <p>Sin datos</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard Aspirantes" description="Resumen de actividad y formación del personal aspirante." />
        <div className="mb-8 max-w-lg mx-auto">{renderChart('Asistencia General de Aspirantes', attendanceDataByGroup['General'])}</div>
        {specializationsWithData.length > 0 && (
            <div>
                <h2 className="font-headline text-2xl font-semibold tracking-tight mb-4 border-b pb-2">Por Especialidad</h2>
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {specializationsWithData.map(spec => <div key={spec}>{renderChart(spec, attendanceDataByGroup[spec])}</div>)}
                 </div>
            </div>
        )}
    </>
  );
}
