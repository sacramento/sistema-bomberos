
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
import { useEffect, useState } from "react";
import { Course } from "@/lib/types";
import { getCourses, deleteCourse } from "@/services/courses.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AddCourseDialog from "./_components/add-course-dialog";
import EditCourseDialog from "./_components/edit-course-dialog";

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const data = await getCourses();
            setCourses(data);
        } catch (error) {
             toast({
                title: "Error",
                description: "No se pudieron cargar los cursos.",
                variant: "destructive"
            })
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchCourses();
    }, []);

    const handleDataChange = () => {
        fetchCourses();
    };

    const handleDelete = async (courseId: string) => {
        try {
            await deleteCourse(courseId);
            toast({
                title: "Éxito",
                description: "El curso ha sido eliminado."
            });
            fetchCourses();
        } catch (error: any) {
             toast({
                title: "Error",
                description: error.message || "No se pudo eliminar el curso.",
                variant: "destructive"
            });
        }
    };


    return (
        <>
            <PageHeader title="Gestión de Cursos Externos" description="Registre y gestione las capacitaciones individuales de los bomberos.">
                <AddCourseDialog onCourseAdded={handleDataChange}>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Registrar Curso
                    </Button>
                </AddCourseDialog>
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Cursos Registrados</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Legajo</TableHead>
                                <TableHead>Bombero</TableHead>
                                <TableHead>Título del Curso</TableHead>
                                <TableHead>Especialidad</TableHead>
                                <TableHead>Lugar</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead><span className="sr-only">Acciones</span></TableHead>
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
                                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                                </TableRow>
                                ))
                            ) : (
                                courses.map((course) => (
                                    <TableRow key={course.id}>
                                        <TableCell className="font-medium">{course.firefighterLegajo}</TableCell>
                                        <TableCell>{course.firefighterName}</TableCell>
                                        <TableCell>{course.title}</TableCell>
                                        <TableCell>{course.specialization}</TableCell>
                                        <TableCell>{course.location}</TableCell>
                                        <TableCell>{format(new Date(course.startDate), "P", { locale: es })} - {format(new Date(course.endDate), "P", { locale: es })}</TableCell>
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
                                                        <EditCourseDialog course={course} onCourseUpdated={handleDataChange}>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                        </EditCourseDialog>
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
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                     {courses.length === 0 && !loading && (
                        <div className="text-center text-muted-foreground py-16">
                            <p>No hay cursos registrados.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
