import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { firefighters, sessions } from "@/lib/data";
import { Download, Filter } from "lucide-react";

const ranks = [
    'ASPIRANTE',
    'BOMBERO',
    'CABO',
    'CABO PRIMERO',
    'SARGENTO',
    'SARGENTO PRIMERO',
    'SUBOFICIAL PRINCIPAL',
    'SUBOFICIAL MAYOR',
    'OFICIAL AYUDANTE',
    'OFICIAL INSPECTOR',
    'OFICIAL PRINCIPAL',
    'SUBCOMANDANTE',
    'COMANDANTE',
    'COMANDANTE MAYOR',
    'COMANDANTE GENERAL'
];

export default function AttendancePage({ params }: { params: { id: string } }) {
    const session = sessions.find(s => s.id === params.id);

    if (!session) {
        return (
          <>
            <PageHeader title="Clase No Encontrada" />
            <p>No se pudo encontrar la clase solicitada.</p>
          </>
        )
    }

    return (
        <>
            <PageHeader title={`Asistencia: ${session.title}`} description={`Registre la asistencia para la clase del ${session.date}.`}>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Asistentes</CardTitle>
                            <CardDescription>Marque el estado de cada bombero asignado a esta clase.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Rango</TableHead>
                                        <TableHead>Cuartel</TableHead>
                                        <TableHead className="text-right">Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {session.attendees.map(firefighter => (
                                        <TableRow key={firefighter.id}>
                                            <TableCell className="font-medium">{firefighter.name}</TableCell>
                                            <TableCell>{firefighter.rank}</TableCell>
                                            <TableCell>{firefighter.firehouse}</TableCell>
                                            <TableCell>
                                                <RadioGroup defaultValue="present" className="flex justify-end gap-4">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="present" id={`r1-${firefighter.id}`} />
                                                        <Label htmlFor={`r1-${firefighter.id}`}>Presente</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="absent" id={`r2-${firefighter.id}`} />
                                                        <Label htmlFor={`r2-${firefighter.id}`}>Ausente</Label>
                                                    </div>
                                                     <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="tardy" id={`r3-${firefighter.id}`} />
                                                        <Label htmlFor={`r3-${firefighter.id}`}>Tarde</Label>
                                                    </div>
                                                     <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="excused" id={`r4-${firefighter.id}`} />
                                                        <Label htmlFor={`r4-${firefighter.id}`}>Justificado</Label>
                                                    </div>
                                                </RadioGroup>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                               <Filter className="h-5 w-5"/> Filtros y Resumen
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                               <Label>Cuartel</Label>
                               <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos los Cuarteles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="s1">Cuartel 1</SelectItem>
                                    <SelectItem value="s2">Cuartel 2</SelectItem>
                                    <SelectItem value="s3">Cuartel 3</SelectItem>
                                </SelectContent>
                               </Select>
                            </div>
                             <div className="space-y-2">
                               <Label>Rango</Label>
                               <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos los Rangos" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ranks.map(rank => (
                                      <SelectItem key={rank} value={rank.toLowerCase().replace(/ /g, '-')}>{rank}</SelectItem>
                                  ))}
                                </SelectContent>
                               </Select>
                            </div>
                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="font-medium">Resumen</h4>
                                <div className="flex justify-between items-center text-sm"><span>Presente:</span> <span className="font-bold">28</span></div>
                                <div className="flex justify-between items-center text-sm"><span>Ausente:</span> <span className="font-bold">2</span></div>
                                <div className="flex justify-between items-center text-sm"><span>Tarde:</span> <span className="font-bold">1</span></div>
                                <div className="flex justify-between items-center text-sm"><span>Justificado:</span> <span className="font-bold">0</span></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}
