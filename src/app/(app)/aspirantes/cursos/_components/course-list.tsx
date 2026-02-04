
'use client';

import { useEffect, useState, useMemo } from "react";
import { Course, Firefighter } from "@/lib/types";
import { getCourses, deleteCourse } from "@/services/courses.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import EditAspiranteCourseDialog from "./edit-course-dialog";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, Edit } from "lucide-react";
import { getFirefighters } from "@/services/firefighters.service";

interface AspiranteCourseListProps {
    refreshSignal: boolean;
    onDataChange: () => void;
    canManage: boolean;
}

export default function AspiranteCourseList({ refreshSignal, onDataChange, canManage }: AspiranteCourseListProps) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchCoursesAndFirefighters = async () => {
        setLoading(true);
        try {
            const [coursesData, firefightersData] = await Promise.all([
                getCourses(),
                getFirefighters()
            ]);
            setCourses(coursesData);
            setAllFirefighters(firefightersData);
        } catch (error) {
             toast({
                title: "Error",
                description: "No se pudieron cargar los datos.",
                variant: "destructive"
            })
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchCoursesAndFirefighters();
    }, [refreshSignal]);

    const aspiranteCourses = useMemo(() => {
        const firefighterMap = new Map(allFirefighters.map(f => [f.id, f]));
        return courses.filter(course => {
            const firefighter = firefighterMap.get(course.firefighterId);
            return firefighter?.rank === 'ASPIRANTE';
        });
    }, [courses, allFirefighters]);

    const handleDelete = async (courseId: string) => {
        try {
            await deleteCourse(courseId);
            toast({
                title: "Éxito",
                description: "El curso ha sido eliminado."
            });
            onDataChange();
        } catch (error: any) {
             toast({
                title: "Error",
                description: error.message || "No se pudo eliminar el curso.",
                variant: "destructive"
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Cursos Registrados para Aspirantes</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Legajo</TableHead>
                            <TableHead>Aspirante</TableHead>
                            <TableHead>Título del Curso</TableHead>
                            <TableHead>Especialidad</TableHead>
                            <TableHead>Lugar</TableHead>
                            <TableHead>Fecha</TableHead>
                            {canManage && <TableHead><span className="sr-only">Acciones</span></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 4 }).map((_, index) => (
                            <TableRow key={index}>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                {canManage && <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>}
                            </TableRow>
                            ))
                        ) : (
                            aspiranteCourses.map((course) => (
                                <TableRow key={course.id}>
                                    <TableCell className="font-medium">{course.firefighterLegajo}</TableCell>
                                    <TableCell>{course.firefighterName}</TableCell>
                                    <TableCell>{course.title}</TableCell>
                                    <TableCell>{course.specialization}</TableCell>
                                    <TableCell>{course.location}</TableCell>
                                    <TableCell>{format(parseISO(course.startDate), "P", { locale: es })} - {format(parseISO(course.endDate), "P", { locale: es })}</TableCell>
                                    {canManage && (
                                        <TableCell>
                                            <AlertDialog>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Toggle menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <EditAspiranteCourseDialog course={course} onCourseUpdated={onDataChange}>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                        </EditAspiranteCourseDialog>
                                                        <DropdownMenuSeparator />
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem className='text-destructive focus:text-destructive' onSelect={(e) => e.preventDefault()}>
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Eliminar
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción no se puede deshacer. Esto eliminará permanentemente el registro del curso.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(course.id)} variant="destructive">
                                                            Eliminar
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                 {aspiranteCourses.length === 0 && !loading && (
                    <div className="text-center text-muted-foreground py-16">
                        <p>No hay cursos registrados para aspirantes.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
