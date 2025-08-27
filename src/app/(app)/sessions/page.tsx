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
import { sessions, firefighters } from '@/lib/data';
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

const chartData = [
  { month: "Enero", attendees: 186, absentees: 80 },
  { month: "Febrero", attendees: 305, absentees: 200 },
  { month: "Marzo", attendees: 237, absentees: 120 },
  { month: "Abril", attendees: 73, absentees: 190 },
  { month: "Mayo", attendees: 209, absentees: 130 },
  { month: "Junio", attendees: 214, absentees: 140 },
]

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
  const activeFirefighters = firefighters.filter(f => f.status === 'Active').length;

  return (
    <>
      <PageHeader
        title="Tablero"
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
            <div className="text-2xl font-bold">{activeFirefighters}</div>
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
            <div className="text-2xl font-bold">+{sessions.length}</div>
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
            <div className="text-2xl font-bold">92.5%</div>
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
                {sessions.slice(0, 4).map((session) => (
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}