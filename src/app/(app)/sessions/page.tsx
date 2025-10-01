

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
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useEffect, useState, useMemo } from 'react';
import { Firefighter, Session, Leave } from '@/lib/types';
import { getFirefighters } from '@/services/firefighters.service';
import { getSessions } from '@/services/sessions.service';
import { getLeaves } from '@/services/leaves.service';
import { Skeleton } from '@/components/ui/skeleton';
import { isWithinInterval, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

const chartConfig = {
  attendees: {
    label: "Presentes",
    color: "hsl(var(--primary))",
  },
  absentees: {
    label: "Ausentes",
    color: "hsl(var(--muted-foreground))",
  },
}

export default function DashboardPage() {
  const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [firefightersData, sessionsData, leavesData] = await Promise.all([
          getFirefighters(),
          getSessions(),
          getLeaves(),
        ]);
        setFirefighters(firefightersData);
        setSessions(sessionsData);
        setLeaves(leavesData);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const dashboardStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeFirefighters = firefighters.filter(f => f.status === 'Active').length;
    const upcomingSessions = sessions.filter(s => new Date(s.date) >= today).length;
    const onLeave = leaves.filter(l => isWithinInterval(today, { start: new Date(l.startDate), end: new Date(l.endDate) })).length;
    
    let attendedCount = 0;
    let totalRequired = 0;
    
    sessions.forEach(session => {
        if(session.attendance) {
            Object.values(session.attendance).forEach(status => {
              if (status === 'present' || status === 'recupero' || status === 'tardy') {
                attendedCount++;
              }
              if (status === 'present' || status === 'tardy' || status === 'absent' || status === 'excused' || status === 'recupero') {
                  totalRequired++;
              }
            });
        }
    });

    const attendanceRate = totalRequired > 0 ? ((attendedCount / totalRequired) * 100).toFixed(0) : "0";
    
    return { activeFirefighters, upcomingSessions, onLeave, attendanceRate };
  }, [firefighters, sessions, leaves]);

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
          let attendees = 0;
          let absentees = 0;
          sessions.forEach(session => {
              const sessionDate = new Date(session.date);
              if (isWithinInterval(sessionDate, { start: monthRange.start, end: monthRange.end })) {
                  if (session.attendance) {
                      Object.values(session.attendance).forEach(status => {
                          if (status === 'present' || status === 'recupero' || status === 'tardy') {
                              attendees++;
                          } else if (status === 'absent' || status === 'excused') {
                              absentees++;
                          }
                      });
                  }
              }
          });
          return { month: monthRange.month.charAt(0).toUpperCase() + monthRange.month.slice(1), attendees, absentees };
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
          {Array.from({length: 4}).map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/3 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Bomberos Activos
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.activeFirefighters}</div>
            <p className="text-xs text-muted-foreground">
              Personal total de guardia
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Próximas Clases
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{dashboardStats.upcomingSessions}</div>
            <p className="text-xs text-muted-foreground">
              Programadas en los próximos 30 días
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Asistencia</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              Promedio en todas las clases
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">De Licencia</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.onLeave}</div>
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
              Un resumen de la asistencia a capacitaciones en los últimos 6 meses.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
              Estas son las próximas clases de capacitación programadas.
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
                {sessions.filter(s => new Date(s.date) >= new Date()).slice(0, 5).map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <Link href={`/classes/${session.id}/attendance`} className="font-medium hover:underline">
                        {session.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{session.specialization}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(session.date), "dd/MM/yy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
