
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts"
import { useEffect, useState, useMemo } from 'react';
import { Firefighter, Session, Specialization, AttendanceStatus } from '@/lib/types';
import { getFirefighters } from '@/services/firefighters.service';
import { getSessions } from '@/services/sessions.service';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const PIE_CHART_COLORS = {
    present: "#22C55E", // green-500
    ausente: "#EF4444", // red-500
    tarde: "#FBBF24", // yellow-400
};

type AttendanceData = {
    present: number;
    absent: number;
    tardy: number;
    recupero: number;
    excused: number;
    totalForPercentage: number;
};

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [firefightersData, sessionsData] = await Promise.all([
          getFirefighters(),
          getSessions(),
        ]);
        setFirefighters(firefightersData);
        setSessions(sessionsData);
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
    const processAttendance = (records: { status: AttendanceStatus }[]): AttendanceData => {
        const counts = records.reduce((acc, record) => {
            acc[record.status] = (acc[record.status] || 0) + 1;
            return acc;
        }, {} as Record<AttendanceStatus, number>);

        const present = counts.present || 0;
        const absent = counts.absent || 0;
        const tardy = counts.tardy || 0;
        const recupero = counts.recupero || 0;
        const excused = counts.excused || 0;
        
        const totalForPercentage = present + absent + tardy + excused;

        return { present, absent, tardy, recupero, excused, totalForPercentage };
    };

    if (sessions.length === 0 || firefighters.length === 0) {
      return {};
    }

    let allRecords: { status: AttendanceStatus, firefighter: Firefighter, session: Session }[] = [];
    const firefighterMap = new Map(firefighters.map(f => [f.id, f]));

    sessions.forEach(session => {
        const participantIds = new Set([
            ...session.instructorIds || [],
            ...session.assistantIds || [],
            ...session.attendeeIds || []
        ]);

        participantIds.forEach(id => {
            const firefighter = firefighterMap.get(id);
            if (!firefighter) return;

            let status = session.attendance?.[id];
            if (!status) {
                if (session.instructorIds?.includes(id) || session.assistantIds?.includes(id)) {
                    status = 'present';
                }
            }

            if (status) {
                allRecords.push({ status, firefighter, session });
            }
        });
    });

    const groupedData: Record<string, AttendanceData> = {
        'General': processAttendance(allRecords),
        'Cuartel 1': processAttendance(allRecords.filter(r => r.firefighter.firehouse === 'Cuartel 1')),
        'Cuartel 2': processAttendance(allRecords.filter(r => r.firefighter.firehouse === 'Cuartel 2')),
        'Cuartel 3': processAttendance(allRecords.filter(r => r.firefighter.firehouse === 'Cuartel 3')),
    };

    const specializations = new Set(allRecords.map(r => r.session.specialization));
    specializations.forEach(spec => {
        groupedData[spec] = processAttendance(allRecords.filter(r => r.session.specialization === spec));
    });

    return groupedData;
  }, [sessions, firefighters]);


  if (loading) {
    return (
      <>
        <PageHeader
          title="Dashboard Asistencia"
          description="Bienvenido de nuevo, aquí hay un resumen de la actividad de tu departamento."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
        <div className="mt-8">
            <Skeleton className="h-10 w-1/3 mb-4" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
      </>
    );
  }
  
  const specializationsWithData = Object.keys(attendanceDataByGroup).filter(key => 
    !['General', 'Cuartel 1', 'Cuartel 2', 'Cuartel 3'].includes(key) && attendanceDataByGroup[key].totalForPercentage > 0
  );

  return (
    <>
      <PageHeader
        title="Dashboard Asistencia"
        description="Bienvenido de nuevo, aquí hay un resumen de la actividad de tu departamento."
      />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {(['General', 'Cuartel 1', 'Cuartel 2', 'Cuartel 3'] as const).map(groupName => {
                const data = attendanceDataByGroup[groupName];
                if (!data) return <Skeleton key={groupName} className="h-64 w-full" />;

                const total = data.totalForPercentage;
                const effectiveAttendance = data.present + (data.tardy * 0.6) + data.recupero;
                const presentPercentage = total > 0 ? Math.min(100, (effectiveAttendance / total) * 100) : 0;
                
                const pieData = [
                    { name: "Presente", value: data.present + data.recupero, color: PIE_CHART_COLORS.present },
                    { name: "Ausente", value: data.absent + data.excused, color: PIE_CHART_COLORS.ausente },
                    { name: "Tarde", value: data.tardy, color: PIE_CHART_COLORS.tarde },
                ].filter(d => d.value > 0);

                return (
                    <Card key={groupName} className="flex flex-col">
                        <CardHeader className="items-center pb-0">
                            <CardTitle className="font-headline text-lg text-center">{groupName}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex items-center justify-center py-2">
                             <ChartContainer config={{}} className="mx-auto aspect-square h-full max-h-[250px]">
                                 {total > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                         <PieChart>
                                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} strokeWidth={5} paddingAngle={pieData.length > 1 ? 5 : 0}>
                                                 {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-3xl font-bold">
                                                {`${presentPercentage.toFixed(0)}%`}
                                            </text>
                                        </PieChart>
                                    </ResponsiveContainer>
                                 ) : (
                                    <div className="flex h-full min-h-[150px] items-center justify-center text-muted-foreground">Sin datos</div>
                                 )}
                            </ChartContainer>
                        </CardContent>
                    </Card>
                )
            })}
        </div>

        {specializationsWithData.length > 0 && (
            <div>
                <h2 className="text-2xl font-headline font-semibold tracking-tight mb-4">Asistencia por Especialidad</h2>
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {specializationsWithData.map(spec => {
                        const data = attendanceDataByGroup[spec];
                        if (!data) return null;
                        
                        const total = data.totalForPercentage;
                        const effectiveAttendance = data.present + (data.tardy * 0.6) + data.recupero;
                        const presentPercentage = total > 0 ? Math.min(100, (effectiveAttendance / total) * 100) : 0;
                        
                        const pieData = [
                            { name: "Presente", value: data.present + data.recupero, color: PIE_CHART_COLORS.present },
                            { name: "Ausente", value: data.absent + data.excused, color: PIE_CHART_COLORS.ausente },
                            { name: "Tarde", value: data.tardy, color: PIE_CHART_COLORS.tarde },
                        ].filter(d => d.value > 0);

                        return (
                             <Card key={spec} className="flex flex-col">
                                <CardHeader className="items-center pb-0">
                                    <CardTitle className="font-headline text-lg text-center">{spec}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 flex items-center justify-center py-2">
                                     <ChartContainer config={{}} className="mx-auto aspect-square h-full max-h-[250px]">
                                         {total > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                 <PieChart>
                                                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} strokeWidth={5} paddingAngle={pieData.length > 1 ? 5 : 0}>
                                                         {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-3xl font-bold">
                                                        {`${presentPercentage.toFixed(0)}%`}
                                                    </text>
                                                </PieChart>
                                            </ResponsiveContainer>
                                         ) : (
                                            <div className="flex h-full min-h-[150px] items-center justify-center text-muted-foreground">Sin datos</div>
                                         )}
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                        )
                    })}
                 </div>
            </div>
        )}
    </>
  );
}
