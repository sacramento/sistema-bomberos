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
import { User, UserRole } from "@/lib/types";
import { updateUser } from "@/services/users.service";
import { uploadProfileImage } from "@/services/storage.service";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const roles: UserRole[] = ['Administrador', 'Operador', 'Ayudantía', 'Bombero'];

export default function EditUserDialog({ children, user, onUserUpdated }: { children: React.ReactNode; user: User; onUserUpdated: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(user.role);
  const [loading, setLoading] = useState(false);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(user.photoURL || null);

  useEffect(() => {
    if (open) {
      setName(user.name);
      setPassword('');
      setRole(user.role);
      setImageFile(null);
      setImagePreview(user.photoURL || null);
    }
  }, [open, user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name || !role) {
        toast({
            title: "Error",
            description: "El nombre y el rol son obligatorios.",
            variant: "destructive",
        });
        return;
    }
    
    setLoading(true);

    try {
        const updatedData: Partial<Omit<User, 'id'>> = {
            name,
            role,
        };

        if (password) {
            updatedData.password = password;
        }

        if (imageFile) {
            const photoURL = await uploadProfileImage(user.id, imageFile);
            updatedData.photoURL = photoURL;
        }
        
        await updateUser(user.id, updatedData);

        toast({
            title: "¡Éxito!",
            description: "El usuario ha sido actualizado.",
        });
        
        onUserUpdated();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error",
            description: error.message || "No se pudo actualizar el usuario. Intente de nuevo.",
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
            <DialogTitle className="font-headline">Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifique los detalles del usuario. Haga clic en guardar cuando haya terminado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={imagePreview || undefined} alt={user.name} className="object-cover" />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <Input id="picture" type="file" accept="image/*" onChange={handleImageChange} className="text-sm"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="id" className="text-right">
                Legajo
              </Label>
              <Input id="id" className="col-span-3" value={user.id} disabled />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input id="name" className="col-span-3" value={name} onChange={e => setName(e.target.value)} required />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Contraseña
              </Label>
              <Input id="password" type="password" placeholder="Dejar en blanco para no cambiar" className="col-span-3" value={password} onChange={e => setPassword(e.target.value)} />
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
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
