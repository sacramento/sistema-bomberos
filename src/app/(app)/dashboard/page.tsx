
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
import {
  BarChart,
  Calendar,
  ShieldCheck,
  UserX,
} from 'lucide-react';
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
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useEffect, useState, useMemo } from 'react';
import { getFirefighters } from '@/services/firefighters.service';
import { getSessions } from '@/services/sessions.service';
import { Session } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const chartConfig = {
  attendees: {
    label: "Asistentes",
    color: "hsl(var(--primary))",
  },
  absentees: {
    label: "Ausentes",
    color: "hsl(var(--muted-foreground))",
  },
}

export default function DashboardPage() {
  const [activeFirefighters, setActiveFirefighters] = useState(0);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const firefighters = await getFirefighters();
        const activeCount = firefighters.filter(f => f.status === 'Active').length;
        setActiveFirefighters(activeCount);

        const sessionData = await getSessions();
        setAllSessions(sessionData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  const availableYears = useMemo(() => {
    const years = new Set(allSessions.map(s => new Date(s.date).getFullYear().toString()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [allSessions]);

  const filteredData = useMemo(() => {
    const sessions = allSessions.filter(session => {
        if(filterYear === 'all') return true;
        return new Date(session.date).getFullYear().toString() === filterYear;
    });

    const monthlyData: Record<string, { present: number, absent: number, tardy: number, excused: number, month: string }> = {};
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    sessions.forEach(session => {
        const monthIndex = new Date(session.date).getMonth();
        const month = monthNames[monthIndex];
        
        if (!monthlyData[month]) {
            monthlyData[month] = { present: 0, absent: 0, tardy: 0, excused: 0, month };
        }
        
        if (session.attendance) {
            Object.values(session.attendance).forEach(status => {
                if (status === 'present') monthlyData[month].present++;
                if (status === 'absent') monthlyData[month].absent++;
                if (status === 'tardy') monthlyData[month].tardy++;
                if (status === 'excused') monthlyData[month].excused++;
            });
        }
    });
    
    const chartData = monthNames.map(month => {
        const data = monthlyData[month];
        if (!data) return { month, attendees: 0, absentees: 0 };
        return {
            month,
            attendees: data.present + data.tardy + data.excused, // Contando todos como asistentes para el gráfico
            absentees: data.absent
        };
    });

    const totalAttendance = Object.values(monthlyData).reduce((acc, data) => acc + data.present, 0);
    const totalTardy = Object.values(monthlyData).reduce((acc, data) => acc + data.tardy, 0);
    const totalExcused = Object.values(monthlyData).reduce((acc, data) => acc + data.excused, 0);
    const totalAbsent = Object.values(monthlyData).reduce((acc, data) => acc + data.absent, 0);
    const totalPossible = totalAttendance + totalTardy + totalExcused + totalAbsent;
    
    // Consideramos presentes, tardes y justificados para el ratio de asistencia
    const attendanceRate = totalPossible > 0 ? ((totalAttendance + totalTardy + totalExcused) / totalPossible) * 100 : 0;


    return {
        sessions,
        chartData,
        attendanceRate
    };

  }, [allSessions, filterYear]);


  return (
    <>
      <PageHeader
        title="Tablero"
        description="Bienvenido de nuevo, aquí hay un resumen de la actividad de tu departamento."
      >
        <div className="w-48">
            <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                    <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Ver Todos</SelectItem>
                     {availableYears.map(year => <SelectItem key={year} value={year}>{`Año ${year}`}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Bomberos Activos
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold">{activeFirefighters}</div>}
            <p className="text-xs text-muted-foreground">
              Personal total de guardia
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clases Programadas
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold">+{filteredData.sessions.length}</div>}
            <p className="text-xs text-muted-foreground">
              {filterYear === 'all' ? 'Total de clases en el sistema' : `Clases para el año ${filterYear}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Asistencia</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold">{filteredData.attendanceRate.toFixed(1)}%</div>}
            <p className="text-xs text-muted-foreground">
              Promedio para el período
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">De Licencia</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Bomberos actualmente de licencia
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-8">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">Asistencia Mensual</CardTitle>
            <CardDescription>
              Resumen de asistencia a capacitaciones para el año {filterYear === 'all' ? 'general' : filterYear}.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <RechartsBarChart accessibilityLayer data={filteredData.chartData}>
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
                <Bar dataKey="attendees" fill="var(--color-attendees)" radius={4} />
                <Bar dataKey="absentees" fill="var(--color-absentees)" radius={4} />
              </RechartsBarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Próximas Clases</CardTitle>
            <CardDescription>
              Próximas clases de capacitación programadas en el período.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clase</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                        <TableRow key={index}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        </TableRow>
                    ))
                ) : (
                    filteredData.sessions.slice(0, 5).map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <Link href={`/classes/${session.id}/attendance`} className="font-medium hover:underline">
                            {session.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{session.specialization}</Badge>
                        </TableCell>
                        <TableCell>{session.date}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    