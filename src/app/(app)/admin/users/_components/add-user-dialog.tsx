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
import { useState } from "react";
import { User, GlobalRole, AttendanceModuleRole, WeekModuleRole, MobilityModuleRole } from "@/lib/types";
import { addUser } from "@/services/users.service";
import { Separator } from "@/components/ui/separator";

const globalRoles: GlobalRole[] = ['Master', 'Oficial', 'Usuario'];
const attendanceRoles: AttendanceModuleRole[] = ['Administrador', 'Operador', 'Ayudantía', 'Bombero', 'Ninguno'];
const weekRoles: WeekModuleRole[] = ['Administrador', 'Encargado', 'Bombero', 'Ninguno'];
const mobilityRoles: MobilityModuleRole[] = ['Administrador', 'Operador', 'Bombero', 'Ninguno'];


export default function AddUserDialog({ children, onUserAdded }: { children: React.ReactNode; onUserAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [legajo, setLegajo] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [globalRole, setGlobalRole] = useState<GlobalRole | ''>('');
  const [asistenciaRole, setAsistenciaRole] = useState<AttendanceModuleRole>('Ninguno');
  const [semanasRole, setSemanasRole] = useState<WeekModuleRole>('Ninguno');
  const [movilidadRole, setMovilidadRole] = useState<MobilityModuleRole>('Ninguno');

  const resetForm = () => {
    setLegajo('');
    setName('');
    setPassword('');
    setGlobalRole('');
    setAsistenciaRole('Ninguno');
    setSemanasRole('Ninguno');
    setMovilidadRole('Ninguno');
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!legajo || !name || !password || !globalRole) {
        toast({
            title: "Error",
            description: "Por favor, complete todos los campos generales.",
            variant: "destructive",
        });
        return;
    }
    
    setLoading(true);

    try {
        const isMasterOrOficial = globalRole === 'Master' || globalRole === 'Oficial';

        const newUser: Omit<User, 'id'> = {
            name,
            password,
            role: globalRole,
            roles: {
                asistencia: isMasterOrOficial ? 'Administrador' : asistenciaRole,
                semanas: isMasterOrOficial ? 'Administrador' : semanasRole,
                movilidad: isMasterOrOficial ? 'Administrador' : movilidadRole,
            }
        };
        
        await addUser(legajo, newUser);

        toast({
            title: "¡Éxito!",
            description: "El nuevo usuario ha sido agregado.",
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Agregar Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Complete los detalles generales y asigne roles para cada módulo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* General Fields */}
            <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="legajo" className="text-right">Legajo</Label>
                  <Input id="legajo" placeholder="Ej: U-004" className="col-span-3" value={legajo} onChange={e => setLegajo(e.target.value)} required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Nombre</Label>
                  <Input id="name" placeholder="Ej: María López" className="col-span-3" value={name} onChange={e => setName(e.target.value)} required />
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
                 <p className="text-sm text-muted-foreground text-center">Si el rol global es Master u Oficial, tendrá acceso total.</p>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="asistenciaRole" className="text-right">Asistencia</Label>
              <Select onValueChange={(value) => setAsistenciaRole(value as AttendanceModuleRole)} value={globalRole === 'Master' || globalRole === 'Oficial' ? 'Administrador' : asistenciaRole} disabled={globalRole === 'Master' || globalRole === 'Oficial'}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {attendanceRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="semanasRole" className="text-right">Semanas</Label>
              <Select onValueChange={(value) => setSemanasRole(value as WeekModuleRole)} value={globalRole === 'Master' || globalRole === 'Oficial' ? 'Administrador' : semanasRole} disabled={globalRole === 'Master' || globalRole === 'Oficial'}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {weekRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="movilidadRole" className="text-right">Movilidad</Label>
              <Select onValueChange={(value) => setMovilidadRole(value as MobilityModuleRole)} value={globalRole === 'Master' || globalRole === 'Oficial' ? 'Administrador' : movilidadRole} disabled={globalRole === 'Master' || globalRole === 'Oficial'}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mobilityRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Usuario'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
