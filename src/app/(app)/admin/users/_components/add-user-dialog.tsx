
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
import { useState, useEffect } from "react";
import { User, GlobalRole, AttendanceModuleRole, WeekModuleRole, MobilityModuleRole, Firefighter, MaterialesModuleRole, AyudantiaModuleRole } from "@/lib/types";
import { addUser, getUsers } from "@/services/users.service";
import { getFirefighters } from "@/services/firefighters.service";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const globalRoles: GlobalRole[] = ['Master', 'Usuario'];
const attendanceRoles: AttendanceModuleRole[] = ['Administrador', 'Oficial', 'Instructor', 'Bombero', 'Ninguno'];
const weekRoles: WeekModuleRole[] = ['Administrador', 'Oficial', 'Encargado', 'Bombero', 'Ninguno'];
const mobilityRoles: MobilityModuleRole[] = ['Administrador', 'Oficial', 'Encargado Móvil', 'Ninguno'];
const materialesRoles: MaterialesModuleRole[] = ['Administrador', 'Oficial', 'Encargado', 'Bombero', 'Ninguno'];
const ayudantiaRoles: AyudantiaModuleRole[] = ['Administrador', 'Oficial', 'Ninguno'];


export default function AddUserDialog({ children, onUserAdded }: { children: React.ReactNode; onUserAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [password, setPassword] = useState('');
  const [globalRole, setGlobalRole] = useState<GlobalRole | ''>('');
  const [asistenciaRole, setAsistenciaRole] = useState<AttendanceModuleRole>('Ninguno');
  const [semanasRole, setSemanasRole] = useState<WeekModuleRole>('Ninguno');
  const [movilidadRole, setMovilidadRole] = useState<MobilityModuleRole>('Ninguno');
  const [materialesRole, setMaterialesRole] = useState<MaterialesModuleRole>('Ninguno');
  const [ayudantiaRole, setAyudantiaRole] = useState<AyudantiaModuleRole>('Ninguno');

  // Data for selection
  const [availableFirefighters, setAvailableFirefighters] = useState<Firefighter[]>([]);
  const [selectedFirefighter, setSelectedFirefighter] = useState<Firefighter | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);


  useEffect(() => {
    const fetchAvailableFirefighters = async () => {
        if (open) {
            setDataLoading(true);
            try {
                const [allUsers, allFirefighters] = await Promise.all([getUsers(), getFirefighters()]);
                const existingUserIds = new Set(allUsers.map(u => u.id));
                const available = allFirefighters.filter(f => !existingUserIds.has(f.legajo));
                setAvailableFirefighters(available);
            } catch (error) {
                 toast({
                    title: "Error",
                    description: "No se pudieron cargar los bomberos disponibles para crear usuarios.",
                    variant: "destructive",
                });
            } finally {
                setDataLoading(false);
            }
        }
    };
    fetchAvailableFirefighters();
  }, [open, toast]);


  const resetForm = () => {
    setSelectedFirefighter(null);
    setPassword('');
    setGlobalRole('');
    setAsistenciaRole('Ninguno');
    setSemanasRole('Ninguno');
    setMovilidadRole('Ninguno');
    setMaterialesRole('Ninguno');
    setAyudantiaRole('Ninguno');
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFirefighter || !password || !globalRole) {
        toast({
            title: "Error",
            description: "Debe seleccionar un bombero y completar la contraseña y el rol global.",
            variant: "destructive",
        });
        return;
    }
    
    setLoading(true);

    try {
        const isMaster = globalRole === 'Master';

        const newUser: Omit<User, 'id'> = {
            name: `${selectedFirefighter.firstName} ${selectedFirefighter.lastName}`,
            password,
            role: globalRole,
            roles: {
                asistencia: isMaster ? 'Administrador' : asistenciaRole,
                semanas: isMaster ? 'Administrador' : semanasRole,
                movilidad: isMaster ? 'Administrador' : movilidadRole,
                materiales: isMaster ? 'Administrador' : materialesRole,
                ayudantia: isMaster ? 'Administrador' : ayudantiaRole,
            }
        };
        
        await addUser(selectedFirefighter.legajo, newUser);

        toast({
            title: "¡Éxito!",
            description: `El usuario para ${selectedFirefighter.lastName} ha sido agregado.`,
        });
        
        onUserAdded();
        resetForm();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error",
            description: error.message || "No se pudo agregar el usuario. Intente de nuevo.",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Agregar Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Seleccione un bombero para crear su cuenta de usuario y asigne roles.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* General Fields */}
            <div className="space-y-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="firefighter-select" className="text-right">Bombero</Label>
                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                        <PopoverTrigger asChild className="col-span-3">
                            <Button variant="outline" role="combobox" aria-expanded={comboboxOpen} className="w-full justify-between" disabled={dataLoading}>
                                {dataLoading ? 'Cargando bomberos...' : selectedFirefighter ? `${selectedFirefighter.legajo} - ${selectedFirefighter.lastName}` : 'Seleccionar bombero...'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                             <Command>
                                <CommandInput placeholder="Buscar bombero..." />
                                <CommandList>
                                <CommandEmpty>No se encontraron bomberos sin usuario.</CommandEmpty>
                                <CommandGroup>
                                    {availableFirefighters.map((firefighter) => (
                                    <CommandItem key={firefighter.id} value={`${firefighter.legajo} ${firefighter.firstName} ${firefighter.lastName}`}
                                        onSelect={() => { setSelectedFirefighter(firefighter); setComboboxOpen(false); }}>
                                        <Check className={cn("mr-2 h-4 w-4", selectedFirefighter?.id === firefighter.id ? "opacity-100" : "opacity-0")} />
                                        {`${firefighter.legajo} - ${firefighter.lastName}, ${firefighter.firstName}`}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">Contraseña</Label>
                  <Input id="password" type="password" placeholder="••••••••" className="col-span-3" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="globalRole" className="text-right">Rol Global</Label>
                  <Select onValueChange={(value) => setGlobalRole(value as GlobalRole)} value={globalRole} required>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione un rol global" /></SelectTrigger>
                    <SelectContent>
                      {globalRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
            </div>

            <Separator />

            {/* Module Roles */}
            <div className="space-y-2">
                <h4 className="font-medium text-center">Roles por Módulo</h4>
                 <p className="text-sm text-muted-foreground text-center">El rol "Master" hereda permisos de Administrador en todos los módulos.</p>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="asistenciaRole" className="text-right">Asistencia</Label>
              <Select onValueChange={(value) => setAsistenciaRole(value as AttendanceModuleRole)} value={globalRole === 'Master' ? 'Administrador' : asistenciaRole} disabled={globalRole === 'Master'}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {attendanceRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="semanasRole" className="text-right">Semanas</Label>
              <Select onValueChange={(value) => setSemanasRole(value as WeekModuleRole)} value={globalRole === 'Master' ? 'Administrador' : semanasRole} disabled={globalRole === 'Master'}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {weekRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="movilidadRole" className="text-right">Movilidad</Label>
              <Select onValueChange={(value) => setMovilidadRole(value as MobilityModuleRole)} value={globalRole === 'Master' ? 'Administrador' : movilidadRole} disabled={globalRole === 'Master'}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mobilityRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="materialesRole" className="text-right">Materiales</Label>
              <Select onValueChange={(value) => setMaterialesRole(value as MaterialesModuleRole)} value={globalRole === 'Master' ? 'Administrador' : materialesRole} disabled={globalRole === 'Master'}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {materialesRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ayudantiaRole" className="text-right">Ayudantía</Label>
              <Select onValueChange={(value) => setAyudantiaRole(value as AyudantiaModuleRole)} value={globalRole === 'Master' ? 'Administrador' : ayudantiaRole} disabled={globalRole === 'Master'}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ayudantiaRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || dataLoading}>{loading ? 'Guardando...' : 'Guardar Usuario'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
