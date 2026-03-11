
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
import { User, GlobalRole, AttendanceModuleRole, WeekModuleRole, MobilityModuleRole, MaterialesModuleRole, AyudantiaModuleRole, RoperiaModuleRole, ServiciosModuleRole, CascadaModuleRole, AspirantesModuleRole } from "@/lib/types";
import { updateUser } from "@/services/users.service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";

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


export default function EditUserDialog({ children, user, onUserUpdated }: { children: React.ReactNode; user: User; onUserUpdated: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { user: actor } = useAuth();

  // Form State
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState('');
  const [globalRole, setGlobalRole] = useState<GlobalRole>(user.role);
  const [asistenciaRole, setAsistenciaRole] = useState<AttendanceModuleRole>(user.roles.asistencia);
  const [aspirantesRole, setAspirantesRole] = useState<AspirantesModuleRole>(user.roles.aspirantes || 'Ninguno');
  const [semanasRole, setSemanasRole] = useState<WeekModuleRole>(user.roles.semanas);
  const [movilidadRole, setMovilidadRole] = useState<MobilityModuleRole>(user.roles.movilidad);
  const [materialesRole, setMaterialesRole] = useState<MaterialesModuleRole>(user.roles.materiales);
  const [ayudantiaRole, setAyudantiaRole] = useState<AyudantiaModuleRole>(user.roles.ayudantia || 'Ninguno');
  const [roperiaRole, setRoperiaRole] = useState<RoperiaModuleRole>(user.roles.roperia || 'Ninguno');
  const [serviciosRole, setServiciosRole] = useState<ServiciosModuleRole>(user.roles.servicios || 'Ninguno');
  const [cascadaRole, setCascadaRole] = useState<CascadaModuleRole>(user.roles.cascada || 'Ninguno');
  
  const imagePreview = `https://picsum.photos/seed/${user.id}/200`;

  useEffect(() => {
    if (open) {
      setName(user.name);
      setPassword('');
      setGlobalRole(user.role);
      setAsistenciaRole(user.roles.asistencia);
      setAspirantesRole(user.roles.aspirantes || 'Ninguno');
      setSemanasRole(user.roles.semanas);
      setMovilidadRole(user.roles.movilidad);
      setMaterialesRole(user.roles.materiales || 'Ninguno');
      setAyudantiaRole(user.roles.ayudantia || 'Ninguno');
      setRoperiaRole(user.roles.roperia || 'Ninguno');
      setServiciosRole(user.roles.servicios || 'Ninguno');
      setCascadaRole(user.roles.cascada || 'Ninguno');
    }
  }, [open, user]);

  const isMaster = useMemo(() => globalRole === 'Master', [globalRole]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name || !globalRole || !actor) {
        toast({ title: "Error", description: "Faltan datos requeridos.", variant: "destructive" });
        return;
    }
    
    setLoading(true);
    try {
        const updatedData: Partial<Omit<User, 'id'>> = {
            name,
            role: globalRole,
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

        if (password) updatedData.password = password;
        
        await updateUser(user.id, updatedData, actor);
        toast({ title: "¡Éxito!", description: "El usuario ha sido actualizado." });
        onUserUpdated();
        setOpen(false);
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "No se pudo actualizar el usuario.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-headline">Editar Usuario</DialogTitle>
            <DialogDescription>Modifique los detalles y roles por módulo.</DialogDescription>
          </DialogHeader>

          <div className="flex-grow overflow-y-auto py-4 pr-4 grid gap-6">
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24"><AvatarImage src={imagePreview} alt={user.name} className="object-cover"/><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Legajo</Label>
                  <Input className="col-span-3" value={user.id} disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Nombre</Label>
                  <Input className="col-span-3" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-xs">Contraseña</Label>
                  <Input type="password" placeholder="Dejar vacío para no cambiar" className="col-span-3" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Rol Global</Label>
                  <Select onValueChange={(value) => setGlobalRole(value as GlobalRole)} value={globalRole} required>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>{globalRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
            </div>

            <Separator />
            <div className="space-y-2"><h4 className="font-medium text-center text-xs uppercase text-muted-foreground">Roles por Módulo</h4></div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Asistencia</Label>
              <Select onValueChange={(value) => setAsistenciaRole(value as AttendanceModuleRole)} value={isMaster ? 'Administrador' : asistenciaRole} disabled={isMaster}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{attendanceRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Aspirantes</Label>
              <Select onValueChange={(value) => setAspirantesRole(value as AspirantesModuleRole)} value={isMaster ? 'Administrador' : aspirantesRole} disabled={isMaster}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{aspirantesRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Semanas</Label>
              <Select onValueChange={(value) => setSemanasRole(value as WeekModuleRole)} value={isMaster ? 'Administrador' : semanasRole} disabled={isMaster}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{weekRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Movilidad</Label>
              <Select onValueChange={(value) => setMovilidadRole(value as MobilityModuleRole)} value={isMaster ? 'Administrador' : movilidadRole} disabled={isMaster}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{mobilityRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Materiales</Label>
              <Select onValueChange={(value) => setMaterialesRole(value as MaterialesModuleRole)} value={isMaster ? 'Administrador' : materialesRole} disabled={isMaster}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{materialesRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Ayudantía</Label>
              <Select onValueChange={(value) => setAyudantiaRole(value as AyudantiaModuleRole)} value={isMaster ? 'Administrador' : ayudantiaRole} disabled={isMaster}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{ayudantiaRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Ropería</Label>
              <Select onValueChange={(value) => setRoperiaRole(value as RoperiaModuleRole)} value={isMaster ? 'Administrador' : roperiaRole} disabled={isMaster}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{roperiaRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Servicios</Label>
              <Select onValueChange={(value) => setServiciosRole(value as ServiciosModuleRole)} value={isMaster ? 'Administrador' : serviciosRole} disabled={isMaster}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{serviciosRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Cascada</Label>
              <Select onValueChange={(value) => setCascadaRole(value as CascadaModuleRole)} value={isMaster ? 'Administrador' : cascadaRole} disabled={isMaster}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{cascadaRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
