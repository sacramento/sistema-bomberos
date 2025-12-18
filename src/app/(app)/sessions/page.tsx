
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
import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts"
import { useEffect, useState, useMemo } from 'react';
import { Firefighter, Session, Specialization, AttendanceStatus } from '@/lib/types';
import { getFirefighters } from '@/services/firefighters.service';
import { getSessions } from '@/services/sessions.service';
import { Skeleton } from '@/components/ui/skeleton';

const PIE_CHART_COLORS = {
    present: "#22C55E",
    absent: "#EF4444",
    tardy: "#FBBF24",
    recupero: "#3B82F6",
    excused: "#8B5CF6",
};

type AttendanceData = {
    present: number;
    absent: number;
    tardy: number;
    recupero: number;
    excused: number;
    totalForPercentage: number;
};

const DonutChartCard = ({ title, data }: { title: string, data: AttendanceData }) => {
    const pieData = [
        { name: "Presente", value: data.present + data.recupero, fill: PIE_CHART_COLORS.present },
        { name: "Ausente", value: data.absent + data.excused, fill: PIE_CHART_COLORS.absent },
        { name: "Tarde", value: data.tardy, fill: PIE_CHART_COLORS.tardy },
    ].filter(d => d.value > 0);

    const total = data.totalForPercentage;
    const effectiveAttendance = data.present + (data.tardy * 0.6) + data.recupero;
    const presentPercentage = total > 0 ? Math.min(100, (effectiveAttendance / total) * 100) : 0;

    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle className="font-headline text-lg text-center">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center py-2">
                 {total > 0 ? (
                     <ChartContainer config={{}} className="mx-auto aspect-square h-full max-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} strokeWidth={5} paddingAngle={5}>
                                     {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold fill-foreground">
                                    {`${presentPercentage.toFixed(0)}%`}
                                </text>
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                 ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Sin datos</div>
                 )}
            </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

 const attendanceDataByGroup = useMemo(() => {
    if (sessions.length === 0 || firefighters.length === 0) {
      return {};
    }

    let allRecords: { status: AttendanceStatus, firefighter: Firefighter, session: Session }[] = [];
    sessions.forEach(session => {
        const allParticipantIds = new Set([
            ...(session.instructorIds || []),
            ...(session.assistantIds || []),
            ...(session.attendeeIds || [])
        ]);

        allParticipantIds.forEach(firefighterId => {
            const firefighter = firefighters.find(f => f.id === firefighterId);
            if (firefighter) {
                let status = session.attendance?.[firefighterId];
                if (!status && (session.instructorIds?.includes(firefighterId) || session.assistantIds?.includes(firefighterId))) {
                    status = 'present';
                }

                if (status) {
                    allRecords.push({ status, firefighter, session });
                }
            }
        });
    });
    
    const processAttendance = (records: typeof allRecords): AttendanceData => {
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
            {attendanceDataByGroup['General'] && <DonutChartCard title="General" data={attendanceDataByGroup['General']} />}
            {attendanceDataByGroup['Cuartel 1'] && <DonutChartCard title="Cuartel 1" data={attendanceDataByGroup['Cuartel 1']} />}
            {attendanceDataByGroup['Cuartel 2'] && <DonutChartCard title="Cuartel 2" data={attendanceDataByGroup['Cuartel 2']} />}
            {attendanceDataByGroup['Cuartel 3'] && <DonutChartCard title="Cuartel 3" data={attendanceDataByGroup['Cuartel 3']} />}
        </div>

        {specializationsWithData.length > 0 && (
            <div>
                <h2 className="text-2xl font-headline font-semibold tracking-tight mb-4">Asistencia por Especialidad</h2>
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {specializationsWithData.map(spec => (
                        <DonutChartCard key={spec} title={spec} data={attendanceDataByGroup[spec]} />
                    ))}
                 </div>
            </div>
        )}
    </>
  );
}
