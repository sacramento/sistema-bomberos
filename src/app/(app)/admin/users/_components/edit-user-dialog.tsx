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
import { User, GlobalRole, AttendanceModuleRole, WeekModuleRole, MobilityModuleRole } from "@/lib/types";
import { updateUser } from "@/services/users.service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const globalRoles: GlobalRole[] = ['Master', 'Oficial', 'Usuario'];
const attendanceRoles: AttendanceModuleRole[] = ['Administrador', 'Operador', 'Ayudantía', 'Bombero', 'Ninguno'];
const weekRoles: WeekModuleRole[] = ['Administrador', 'Encargado', 'Bombero', 'Ninguno'];
const mobilityRoles: MobilityModuleRole[] = ['Administrador', 'Operador', 'Bombero', 'Ninguno'];

export default function EditUserDialog({ children, user, onUserUpdated }: { children: React.ReactNode; user: User; onUserUpdated: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState('');
  const [globalRole, setGlobalRole] = useState<GlobalRole>(user.role);
  const [asistenciaRole, setAsistenciaRole] = useState<AttendanceModuleRole>(user.roles.asistencia);
  const [semanasRole, setSemanasRole] = useState<WeekModuleRole>(user.roles.semanas);
  const [movilidadRole, setMovilidadRole] = useState<MobilityModuleRole>(user.roles.movilidad);
  
  const imagePreview = `https://picsum.photos/seed/${user.id}/200`;

  useEffect(() => {
    if (open) {
      setName(user.name);
      setPassword('');
      setGlobalRole(user.role);
      setAsistenciaRole(user.roles.asistencia);
      setSemanasRole(user.roles.semanas);
      setMovilidadRole(user.roles.movilidad);
    }
  }, [open, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name || !globalRole) {
        toast({ title: "Error", description: "El nombre y el rol global son obligatorios.", variant: "destructive" });
        return;
    }
    
    setLoading(true);

    try {
        const isMasterOrOficial = globalRole === 'Master' || globalRole === 'Oficial';
        
        const updatedData: Partial<Omit<User, 'id'>> = {
            name,
            role: globalRole,
            roles: {
                asistencia: isMasterOrOficial ? 'Administrador' : asistenciaRole,
                semanas: isMasterOrOficial ? 'Administrador' : semanasRole,
                movilidad: isMasterOrOficial ? 'Administrador' : movilidadRole,
            }
        };

        if (password) {
            updatedData.password = password;
        }
        
        await updateUser(user.id, updatedData);

        toast({ title: "¡Éxito!", description: "El usuario ha sido actualizado." });
        
        onUserUpdated();
        setOpen(false);

    } catch (error: any) {
        console.error("Error updating user:", error);
        toast({ title: "Error", description: error.message || "No se pudo actualizar el usuario.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifique los detalles del usuario y sus roles por módulo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24"><AvatarImage src={imagePreview} alt={user.name} className="object-cover"/><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
            </div>

            {/* General Fields */}
            <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="id" className="text-right">Legajo</Label>
                  <Input id="id" className="col-span-3" value={user.id} disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name-edit" className="text-right">Nombre</Label>
                  <Input id="name-edit" className="col-span-3" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password-edit" className="text-right">Contraseña</Label>
                  <Input id="password-edit" type="password" placeholder="Dejar en blanco para no cambiar" className="col-span-3" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="globalRole-edit" className="text-right">Rol Global</Label>
                  <Select onValueChange={(value) => setGlobalRole(value as GlobalRole)} value={globalRole} required>
                    <SelectTrigger id="globalRole-edit" className="col-span-3"><SelectValue /></SelectTrigger>
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
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="asistenciaRole-edit" className="text-right">Asistencia</Label>
              <Select onValueChange={(value) => setAsistenciaRole(value as AttendanceModuleRole)} value={globalRole === 'Master' || globalRole === 'Oficial' ? 'Administrador' : asistenciaRole} disabled={globalRole === 'Master' || globalRole === 'Oficial'}>
                <SelectTrigger id="asistenciaRole-edit" className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {attendanceRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="semanasRole-edit" className="text-right">Semanas</Label>
              <Select onValueChange={(value) => setSemanasRole(value as WeekModuleRole)} value={globalRole === 'Master' || globalRole === 'Oficial' ? 'Administrador' : semanasRole} disabled={globalRole === 'Master' || globalRole === 'Oficial'}>
                <SelectTrigger id="semanasRole-edit" className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {weekRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="movilidadRole-edit" className="text-right">Movilidad</Label>
              <Select onValueChange={(value) => setMovilidadRole(value as MobilityModuleRole)} value={globalRole === 'Master' || globalRole === 'Oficial' ? 'Administrador' : movilidadRole} disabled={globalRole === 'Master' || globalRole === 'Oficial'}>
                <SelectTrigger id="movilidadRole-edit" className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mobilityRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
