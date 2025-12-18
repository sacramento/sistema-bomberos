

'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from "recharts"
import { useEffect, useState, useMemo } from 'react';
import { Firefighter, Session, Leave, Specialization } from '@/lib/types';
import { getFirefighters } from '@/services/firefighters.service';
import { getSessions } from '@/services/sessions.service';
import { Skeleton } from '@/components/ui/skeleton';
import { isWithinInterval, startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const chartConfigBar = {
  presentes: {
    label: "Presentes",
    color: "hsl(var(--chart-1))",
  },
  ausentes: {
    label: "Ausentes",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const PIE_CHART_COLORS = {
    present: "hsl(var(--chart-1))",
    absent: "hsl(var(--chart-2))",
    tardy: "hsl(var(--chart-4))",
};

const SPECIALIZATION_CHART_COLORS: Record<Specialization, string> = {
    'RESCATE VEHICULAR': "#3B82F6",
    'RESCATE URBANO': "#1D4ED8",
    FUEGO: "#EF4444",
    APH: "#22C55E",
    'HAZ-MAT': "#F97316",
    FORESTAL: "#16A34A",
    BUCEO: "#0EA5E9",
    PAE: "#FBBF24",
    GORA: "#A855F7",
    KAIZEN: "#6366F1",
    VARIOS: "#64748B",
    RESCATE: "#3B82F6",
};

type AttendanceData = {
    present: number;
    absent: number;
    tardy: number;
    total: number;
};

type ChartConfig = typeof chartConfigBar;

const DonutChartCard = ({ title, data }: { title: string, data: AttendanceData }) => {
    const pieData = [
        { name: "Presente", value: data.present, fill: PIE_CHART_COLORS.present },
        { name: "Ausente", value: data.absent, fill: PIE_CHART_COLORS.absent },
        { name: "Tarde", value: data.tardy, fill: PIE_CHART_COLORS.tardy },
    ].filter(d => d.value > 0);

    const total = data.total;
    const presentPercentage = total > 0 ? (data.present / total) * 100 : 0;

    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle className="font-headline text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center py-2">
                 {total > 0 ? (
                     <ChartContainer config={chartConfigBar} className="mx-auto aspect-square h-full max-h-[250px]">
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

const SpecializationDonutCard = ({ data }: { data: { name: Specialization, value: number }[] }) => {
     const pieData = data.map(item => ({
        ...item,
        fill: SPECIALIZATION_CHART_COLORS[item.name] || '#ccc'
    }));
    
     const RADIAN = Math.PI / 180;
     const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent < 0.05) return null;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="font-headline">Distribución por Especialidad</CardTitle>
                 <CardDescription>Cantidad de clases impartidas por especialidad.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false} label={renderCustomizedLabel}>
                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                            </Pie>
                            <ChartLegend content={<ChartLegendContent layout="vertical" align="right" verticalAlign="middle" />} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    )
};


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

  const { attendanceData, specializationData } = useMemo(() => {
      if (sessions.length === 0 || firefighters.length === 0) {
          return { attendanceData: {}, specializationData: [] };
      }

      const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
      
      const processAttendance = (records: { firefighterId: string, status: string }[]) => {
          let present = 0, absent = 0, tardy = 0;
          records.forEach(record => {
              if (record.status === 'present' || record.status === 'recupero') present++;
              else if (record.status === 'absent' || record.status === 'excused') absent++;
              else if (record.status === 'tardy') tardy++;
          });
          const total = present + absent + tardy;
          return { present, absent, tardy, total };
      }

      let allRecords: { firefighterId: string, status: string, firehouse: string }[] = [];
      sessions.forEach(session => {
          if (session.attendance) {
              Object.entries(session.attendance).forEach(([firefighterId, status]) => {
                  const firefighter = firefighterMap.get(firefighterId);
                  if (firefighter) {
                       allRecords.push({ firefighterId, status, firehouse: firefighter.firehouse });
                  }
              });
          }
      });
      
      const attendanceByCuartel = {
          'Cuartel 1': processAttendance(allRecords.filter(r => r.firehouse === 'Cuartel 1')),
          'Cuartel 2': processAttendance(allRecords.filter(r => r.firehouse === 'Cuartel 2')),
          'Cuartel 3': processAttendance(allRecords.filter(r => r.firehouse === 'Cuartel 3')),
          'General': processAttendance(allRecords)
      };

      const specializationCounts = sessions.reduce((acc, session) => {
          acc[session.specialization] = (acc[session.specialization] || 0) + 1;
          return acc;
      }, {} as Record<Specialization, number>);

      const specData = Object.entries(specializationCounts)
        .map(([name, value]) => ({ name: name as Specialization, value }))
        .sort((a, b) => b.value - a.value);


      return { attendanceData: attendanceByCuartel, specializationData: specData };
  }, [sessions, firefighters]);

  const chartData = useMemo(() => {
      const last6Months = Array.from({ length: 6 }).map((_, i) => {
        const d = subMonths(new Date(), i);
        return {
            month: format(d, 'MMMM', { locale: es }),
            start: startOfMonth(d),
            end: endOfMonth(d)
        };
      }).reverse();

      return last6Months.map(monthRange => {
          let presentes = 0;
          let ausentes = 0;
          sessions.forEach(session => {
              const sessionDate = parseISO(session.date);
              if (isWithinInterval(sessionDate, { start: monthRange.start, end: monthRange.end })) {
                  if (session.attendance) {
                      Object.values(session.attendance).forEach(status => {
                          if (status === 'present' || status === 'recupero' || status === 'tardy') {
                              presentes++;
                          } else if (status === 'absent' || status === 'excused') {
                              ausentes++;
                          }
                      });
                  }
              }
          });
          return { month: monthRange.month.charAt(0).toUpperCase() + monthRange.month.slice(1), presentes, ausentes };
      });
  }, [sessions]);


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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-8">
            <Skeleton className="lg:col-span-4 h-96" />
            <Skeleton className="lg:col-span-3 h-96" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard Asistencia"
        description="Bienvenido de nuevo, aquí hay un resumen de la actividad de tu departamento."
      />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DonutChartCard title="General" data={attendanceData['General']} />
            <DonutChartCard title="Cuartel 1" data={attendanceData['Cuartel 1']} />
            <DonutChartCard title="Cuartel 2" data={attendanceData['Cuartel 2']} />
            <DonutChartCard title="Cuartel 3" data={attendanceData['Cuartel 3']} />
        </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-8">
        <SpecializationDonutCard data={specializationData} />
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="font-headline">Asistencia Mensual</CardTitle>
            <CardDescription>
              Un resumen de la asistencia a capacitaciones en los últimos 6 meses.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             <ChartContainer config={chartConfigBar} className="h-[300px] w-full">
              <RechartsBarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                 <YAxis />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                 <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="presentes" fill="var(--color-presentes)" radius={4} />
                <Bar dataKey="ausentes" fill="var(--color-ausentes)" radius={4} />
              </RechartsBarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

