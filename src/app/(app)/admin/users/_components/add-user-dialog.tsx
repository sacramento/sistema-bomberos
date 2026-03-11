
'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { GlobalRole, AttendanceModuleRole, WeekModuleRole, MobilityModuleRole, Firefighter, MaterialesModuleRole, AyudantiaModuleRole, RoperiaModuleRole, ServiciosModuleRole, CascadaModuleRole, AspirantesModuleRole } from "@/lib/types";
import { addUser, getUsers } from "@/services/users.service";
import { getFirefighters } from "@/services/firefighters.service";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

const globalRoles: GlobalRole[] = ['Master', 'Usuario'];
const attendanceRoles: AttendanceModuleRole[] = ['Administrador', 'Oficial', 'Instructor', 'Bombero', 'Ninguno'];
const aspirantesRoles: AspirantesModuleRole[] = ['Administrador', 'Oficial', 'Instructor', 'Bombero', 'Ninguno'];
const weekRoles: WeekModuleRole[] = ['Administrador', 'Oficial', 'Encargado', 'Bombero', 'Ninguno'];
const mobilityRoles: MobilityModuleRole[] = ['Administrador', 'Oficial', 'Encargado Móvil', 'Ninguno'];
const materialesRoles: MaterialesModuleRole[] = ['Administrador', 'Oficial', 'Encargado', 'Bombero', 'Ninguno'];
const ayudantiaRoles: AyudantiaModuleRole[] = ['Administrador', 'Oficial', 'Ninguno'];
const roperiaRoles: RoperiaModuleRole[] = ['Administrador', 'Encargado', 'Oficial', 'Bombero', 'Ninguno'];
const serviciosRoles: ServiciosModuleRole[] = ['Administrador', 'Oficial', 'Bombero', 'Ninguno'];
const cascadaRoles: CascadaModuleRole[] = ['Administrador', 'Encargado', 'Bombero', 'Ninguno'];

export default function AddUserDialog({ children, onUserAdded }: { children: React.ReactNode; onUserAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { user: actor } = useAuth();
  
  const [password, setPassword] = useState('');
  const [globalRole, setGlobalRole] = useState<GlobalRole | ''>('');
  const [asistenciaRole, setAsistenciaRole] = useState<AttendanceModuleRole>('Ninguno');
  const [aspirantesRole, setAspirantesRole] = useState<AspirantesModuleRole>('Ninguno');
  const [semanasRole, setSemanasRole] = useState<WeekModuleRole>('Ninguno');
  const [movilidadRole, setMovilidadRole] = useState<MobilityModuleRole>('Ninguno');
  const [materialesRole, setMaterialesRole] = useState<MaterialesModuleRole>('Ninguno');
  const [ayudantiaRole, setAyudantiaRole] = useState<AyudantiaModuleRole>('Ninguno');
  const [roperiaRole, setRoperiaRole] = useState<RoperiaModuleRole>('Ninguno');
  const [serviciosRole, setServiciosRole] = useState<ServiciosModuleRole>('Ninguno');
  const [cascadaRole, setCascadaRole] = useState<CascadaModuleRole>('Ninguno');

  const [availableFirefighters, setAvailableFirefighters] = useState<Firefighter[]>([]);
  const [selectedFirefighter, setSelectedFirefighter] = useState<Firefighter | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  useEffect(() => {
    if (open) {
        setDataLoading(true);
        Promise.all([getUsers(), getFirefighters()]).then(([allUsers, allFirefighters]) => {
            const existingUserIds = new Set(allUsers.map(u => u.id));
            const available = allFirefighters.filter(f => !existingUserIds.has(f.legajo));
            setAvailableFirefighters(available);
        }).catch(() => toast({ title: "Error", description: "Fallo al cargar datos.", variant: "destructive" }))
        .finally(() => setDataLoading(false));
    }
  }, [open, toast]);

  const resetForm = () => {
    setSelectedFirefighter(null); setPassword(''); setGlobalRole(''); setAsistenciaRole('Ninguno'); setAspirantesRole('Ninguno');
    setSemanasRole('Ninguno'); setMovilidadRole('Ninguno'); setMaterialesRole('Ninguno'); setAyudantiaRole('Ninguno');
    setRoperiaRole('Ninguno'); setServiciosRole('Ninguno'); setCascadaRole('Ninguno');
  };

  const isMaster = useMemo(() => globalRole === 'Master', [globalRole]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFirefighter || !password || !globalRole || !actor) {
        toast({ variant: "destructive", title: "Error", description: "Complete todos los campos." });
        return;
    }
    setLoading(true);
    try {
        const newUser = {
            name: `${selectedFirefighter.firstName} ${selectedFirefighter.lastName}`,
            password,
            role: globalRole as GlobalRole,
            roles: {
                asistencia: isMaster ? 'Administrador' : asistenciaRole,
                aspirantes: isMaster ? 'Administrador' : aspirantesRole,
                semanas: isMaster ? 'Administrador' : semanasRole,
                movilidad: isMaster ? 'Administrador' : movilidadRole,
                materiales: isMaster ? 'Administrador' : materialesRole,
                ayudantia: isMaster ? 'Administrador' : ayudantiaRole,
                roperia: isMaster ? 'Administrador' : roperiaRole,
                servicios: isMaster ? 'Administrador' : serviciosRole,
                cascada: isMaster ? 'Administrador' : cascadaRole,
            }
        };
        addUser(selectedFirefighter.legajo, newUser, actor);
        toast({ title: "¡Éxito!", description: "Usuario creado." });
        onUserAdded(); setOpen(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally { setLoading(false); }
  };

  const getDisplayText = (f: Firefighter) => `${f.legajo} - ${f.lastName}, ${f.firstName}`;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-headline">Agregar Nuevo Usuario</DialogTitle>
            <DialogDescription>Asigne legajo, contraseña y roles.</DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto py-4 pr-2 space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label>Bombero</Label>
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild className="col-span-3">
                        <Button variant="outline" role="combobox" aria-expanded={comboboxOpen} className="w-full justify-between h-auto min-h-10 text-left text-xs" disabled={dataLoading}>
                            {selectedFirefighter ? getDisplayText(selectedFirefighter) : 'Seleccionar por legajo o apellido...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Buscar por legajo o apellido..." />
                            <CommandList>
                                <CommandEmpty>Sin resultados.</CommandEmpty>
                                <CommandGroup>
                                    {availableFirefighters.map(f => (
                                        <CommandItem key={f.id} value={`${f.legajo} ${f.lastName} ${f.firstName}`} onSelect={() => { setSelectedFirefighter(f); setComboboxOpen(false); }}>
                                            <Check className={cn("mr-2 h-4 w-4", selectedFirefighter?.id === f.id ? "opacity-100" : "opacity-0")} />
                                            {getDisplayText(f)}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label>Contraseña</Label>
                <Input type="password" placeholder="••••••••" className="col-span-3" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label>Rol Global</Label>
                <Select onValueChange={(v) => setGlobalRole(v as GlobalRole)} value={globalRole} required>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>{globalRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <Separator />
            <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase text-center text-muted-foreground">Permisos por Módulo</h4>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Asistencia</Label>
                    <Select value={isMaster ? 'Administrador' : asistenciaRole} onValueChange={(v) => setAsistenciaRole(v as any)} disabled={isMaster}><SelectTrigger className="col-span-3"><SelectValue/></SelectTrigger><SelectContent>{attendanceRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Aspirantes</Label>
                    <Select value={isMaster ? 'Administrador' : aspirantesRole} onValueChange={(v) => setAspirantesRole(v as any)} disabled={isMaster}><SelectTrigger className="col-span-3"><SelectValue/></SelectTrigger><SelectContent>{aspirantesRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Semanas</Label>
                    <Select value={isMaster ? 'Administrador' : semanasRole} onValueChange={(v) => setSemanasRole(v as any)} disabled={isMaster}><SelectTrigger className="col-span-3"><SelectValue/></SelectTrigger><SelectContent>{weekRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Movilidad</Label>
                    <Select value={isMaster ? 'Administrador' : movilidadRole} onValueChange={(v) => setMovilidadRole(v as any)} disabled={isMaster}><SelectTrigger className="col-span-3"><SelectValue/></SelectTrigger><SelectContent>{mobilityRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Materiales</Label>
                    <Select value={isMaster ? 'Administrador' : materialesRole} onValueChange={(v) => setMaterialesRole(v as any)} disabled={isMaster}><SelectTrigger className="col-span-3"><SelectValue/></SelectTrigger><SelectContent>{materialesRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Ayudantía</Label>
                    <Select value={isMaster ? 'Administrador' : ayudantiaRole} onValueChange={(v) => setAyudantiaRole(v as any)} disabled={isMaster}><SelectTrigger className="col-span-3"><SelectValue/></SelectTrigger><SelectContent>{ayudantiaRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Ropería</Label>
                    <Select value={isMaster ? 'Administrador' : roperiaRole} onValueChange={(v) => setRoperiaRole(v as any)} disabled={isMaster}><SelectTrigger className="col-span-3"><SelectValue/></SelectTrigger><SelectContent>{roperiaRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Servicios</Label>
                    <Select value={isMaster ? 'Administrador' : serviciosRole} onValueChange={(v) => setServiciosRole(v as any)} disabled={isMaster}><SelectTrigger className="col-span-3"><SelectValue/></SelectTrigger><SelectContent>{serviciosRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Cascada</Label>
                    <Select value={isMaster ? 'Administrador' : cascadaRole} onValueChange={(v) => setCascadaRole(v as any)} disabled={isMaster}><SelectTrigger className="col-span-3"><SelectValue/></SelectTrigger><SelectContent>{cascadaRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="animate-spin mr-2 h-4 w-4"/>} 
                Guardar Usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
