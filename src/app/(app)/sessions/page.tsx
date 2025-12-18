
'use client';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Firefighter, Session, Specialization } from '@/lib/types';
import { getFirefighters } from '@/services/firefighters.service';
import { getSessions } from '@/services/sessions.service';
import { Skeleton } from '@/components/ui/skeleton';

const PIE_CHART_COLORS = {
    present: "hsl(var(--chart-1))",
    absent: "hsl(var(--chart-3))",
    tardy: "hsl(var(--chart-4))",
};

type AttendanceData = {
    present: number;
    absent: number;
    tardy: number;
    total: number;
};

const DonutChartCard = ({ title, data }: { title: string, data: AttendanceData }) => {
    const pieData = [
        { name: "Presente", value: data.present, fill: PIE_CHART_COLORS.present },
        { name: "Ausente", value: data.absent, fill: PIE_CHART_COLORS.absent },
        { name: "Tarde", value: data.tardy, fill: PIE_CHART_COLORS.tardy },
    ].filter(d => d.value > 0);

    const total = data.total;
    const presentPercentage = total > 0 ? ((data.present + (data.tardy * 0.6)) / total) * 100 : 0;

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
                                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} strokeWidth={5}>
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
  const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
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

  const { attendanceDataByGroup } = useMemo(() => {
      if (sessions.length === 0 || firefighters.length === 0) {
          return { attendanceDataByGroup: {} };
      }

      const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
      
      const processAttendance = (records: { status: string }[]): AttendanceData => {
          let present = 0, absent = 0, tardy = 0;
          records.forEach(record => {
              if (record.status === 'present' || record.status === 'recupero') present++;
              else if (record.status === 'absent' || record.status === 'excused') absent++;
              else if (record.status === 'tardy') tardy++;
          });
          const total = present + absent + tardy;
          return { present, absent, tardy, total };
      }

      let allRecords: { status: string, firehouse: string, specialization: Specialization }[] = [];
      
      sessions.forEach(session => {
          if (session.attendance) {
              const allParticipantIdsInSession = new Set([
                  ...(session.instructorIds || []),
                  ...(session.assistantIds || []),
                  ...(session.attendeeIds || [])
              ]);
              
              allParticipantIdsInSession.forEach(firefighterId => {
                  const status = session.attendance![firefighterId];
                  const firefighter = firefighterMap.get(firefighterId);
                  
                  if (status && firefighter) {
                      allRecords.push({ 
                          status, 
                          firehouse: firefighter.firehouse, 
                          specialization: session.specialization 
                      });
                  }
              });
          }
      });
      
      const attendanceData: Record<string, AttendanceData> = {
          'General': processAttendance(allRecords),
          'Cuartel 1': processAttendance(allRecords.filter(r => r.firehouse === 'Cuartel 1')),
          'Cuartel 2': processAttendance(allRecords.filter(r => r.firehouse === 'Cuartel 2')),
          'Cuartel 3': processAttendance(allRecords.filter(r => r.firehouse === 'Cuartel 3')),
      };

      const specializations = new Set(allRecords.map(r => r.specialization));
      specializations.forEach(spec => {
          attendanceData[spec] = processAttendance(allRecords.filter(r => r.specialization === spec));
      });

      return { attendanceDataByGroup: attendanceData };
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
    !['General', 'Cuartel 1', 'Cuartel 2', 'Cuartel 3'].includes(key) && attendanceDataByGroup[key].total > 0
  );

  return (
    <>
      <PageHeader
        title="Dashboard Asistencia"
        description="Bienvenido de nuevo, aquí hay un resumen de la actividad de tu departamento."
      />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <DonutChartCard title="General" data={attendanceDataByGroup['General']} />
            <DonutChartCard title="Cuartel 1" data={attendanceDataByGroup['Cuartel 1']} />
            <DonutChartCard title="Cuartel 2" data={attendanceDataByGroup['Cuartel 2']} />
            <DonutChartCard title="Cuartel 3" data={attendanceDataByGroup['Cuartel 3']} />
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
