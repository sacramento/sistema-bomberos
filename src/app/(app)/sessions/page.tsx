
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

type AttendanceSummary = {
    present: number;
    absent: number;
    tardy: number;
    recupero: number;
    excused: number;
    totalForPercentage: number;
    presentPercentage: number;
};

// --- Componente de Gráfico Rediseñado ---
const DonutChartCard = ({ title, data, isLoading }: { title: string, data: AttendanceSummary | undefined, isLoading: boolean }) => {
    if (isLoading) {
        return <Skeleton className="h-64 w-full" />;
    }

    if (!data || data.totalForPercentage === 0) {
        return (
            <Card className="flex flex-col">
                <CardHeader className="items-center pb-2">
                    <CardTitle className="font-headline text-lg text-center">{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">Sin datos</div>
                </CardContent>
            </Card>
        );
    }
    
    const pieData = [
        { name: "Presente", value: data.present + data.recupero, color: PIE_CHART_COLORS.present },
        { name: "Ausente", value: data.absent + data.excused, color: PIE_CHART_COLORS.ausente },
        { name: "Tarde", value: data.tardy, color: PIE_CHART_COLORS.tarde },
    ].filter(d => d.value > 0);

    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle className="font-headline text-lg text-center">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center py-2">
                 <ChartContainer config={{}} className="mx-auto aspect-square h-full max-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} strokeWidth={5} paddingAngle={pieData.length > 1 ? 5 : 0}>
                                 {pieData.map((entry) => (
                                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-3xl font-bold">
                                {`${data.presentPercentage.toFixed(0)}%`}
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
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
    // 1. Crear una lista plana de todos los registros de asistencia válidos
    let allRecords: { status: AttendanceStatus, firefighter: Firefighter, session: Session }[] = [];
    const firefighterMap = new Map(firefighters.map(f => [f.id, f]));

    sessions.forEach(session => {
        const participantIds = new Set([
            ...(session.instructorIds || []),
            ...(session.assistantIds || []),
            ...(session.attendeeIds || [])
        ]);

        participantIds.forEach(id => {
            const firefighter = firefighterMap.get(id);
            if (!firefighter) return;

            let status = session.attendance?.[id];
            // Asumir presente para staff si no hay registro
            if (!status && (session.instructorIds?.includes(id) || session.assistantIds?.includes(id))) {
                status = 'present';
            }

            if (status) {
                allRecords.push({ status, firefighter, session });
            }
        });
    });
    
    // 2. Función para procesar una lista de registros y devolver estadísticas
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
        
        // El total para el porcentaje no debe incluir recuperos, ya que no era una clase requerida para ellos.
        const totalForPercentage = present + absent + tardy + excused;

        // La asistencia efectiva SÍ suma recuperos y pondera las llegadas tarde.
        const effectiveAttendance = present + (tardy * 0.6) + recupero;

        const presentPercentage = totalForPercentage > 0 ? Math.min(100, (effectiveAttendance / totalForPercentage) * 100) : 0;
      
        return { present, absent, tardy, recupero, excused, totalForPercentage, presentPercentage };
    };

    // 3. Crear el objeto final con los datos agrupados
    const groupedData: Record<string, AttendanceSummary> = {
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


  const specializationsWithData = Object.keys(attendanceDataByGroup).filter(key => 
    !['General', 'Cuartel 1', 'Cuartel 2', 'Cuartel 3'].includes(key) && attendanceDataByGroup[key]?.totalForPercentage > 0
  );

  return (
    <>
      <PageHeader
        title="Dashboard Asistencia"
        description="Bienvenido de nuevo, aquí hay un resumen de la actividad de tu departamento."
      />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {(['General', 'Cuartel 1', 'Cuartel 2', 'Cuartel 3'] as const).map(groupName => (
                 <DonutChartCard 
                    key={groupName}
                    title={groupName}
                    data={attendanceDataByGroup[groupName]}
                    isLoading={loading}
                 />
            ))}
        </div>

        {specializationsWithData.length > 0 && (
            <div>
                <h2 className="text-2xl font-headline font-semibold tracking-tight mb-4">Asistencia por Especialidad</h2>
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {specializationsWithData.map(spec => (
                        <DonutChartCard
                            key={spec}
                            title={spec}
                            data={attendanceDataByGroup[spec]}
                            isLoading={loading}
                        />
                    ))}
                 </div>
            </div>
        )}
    </>
  );
}
