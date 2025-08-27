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
import { User, UserRole } from "@/lib/types";
import { addUser } from "@/services/users.service";

const roles: UserRole[] = ['Administrador', 'Operador', 'Asistente'];

export default function AddUserDialog({ children, onUserAdded }: { children: React.ReactNode; onUserAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [id, setId] = useState(''); // This will be the legajo
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [loading, setLoading] = useState(false);
  
  const resetForm = () => {
    setId('');
    setName('');
    setPassword('');
    setRole('');
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !name || !password || !role) {
        toast({
            title: "Error",
            description: "Por favor, complete todos los campos.",
            variant: "destructive",
        });
        return;
    }
    
    setLoading(true);

    try {
        // Construct the user object without the ID, as it will be the document key
        const newUser: Omit<User, 'id'> = {
            name,
            password,
            role: role as UserRole,
        };
        
        // Pass the ID separately to be used as the document ID in Firestore
        await addUser(id, newUser);

        toast({
            title: "¡Éxito!",
            description: "El nuevo usuario ha sido agregado.",
        });
        
        onUserAdded();
        resetForm();
        setOpen(false);

    } catch (error) {
        console.error(error);
        toast({
            title: "Error",
            description: "No se pudo agregar el usuario. Es posible que el legajo ya exista.",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Agregar Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Ingrese los detalles del nuevo usuario. Haga clic en guardar cuando haya terminado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="id" className="text-right">
                Legajo
              </Label>
              <Input id="id" placeholder="Ej: U-004" className="col-span-3" value={id} onChange={e => setId(e.target.value)} required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input id="name" placeholder="Ej: María López" className="col-span-3" value={name} onChange={e => setName(e.target.value)} required />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Contraseña
              </Label>
              <Input id="password" type="password" placeholder="••••••••" className="col-span-3" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Rol
              </Label>
              <Select onValueChange={(value) => setRole(value as UserRole)} value={role} required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
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
