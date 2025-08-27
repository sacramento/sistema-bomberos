'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Lógica de autenticación irá aquí
    // Por ahora, solo redirigimos al tablero
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleLogin}>
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <Flame className="text-primary size-10" />
            </div>
            <CardTitle className="font-headline text-2xl">FuegoRegistro</CardTitle>
            <CardDescription>
              Iniciá sesión para acceder al sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="legajo">Legajo</Label>
              <Input id="legajo" type="text" placeholder="Tu número de legajo" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" placeholder="Tu contraseña" required />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Ingresar
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
