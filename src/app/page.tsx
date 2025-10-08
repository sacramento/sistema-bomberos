
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";


export default function LoginPage() {
  const { user, login, loading, error } = useAuth();
  const router = useRouter();
  const [legajo, setLegajo] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ legajo, password });
  };
  
  useEffect(() => {
    // If a logged-in user somehow lands on the login page, redirect them away.
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);


  // Prevent rendering the form if auth state is loading or user is already logged in
  if (loading || user) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Cargando sesión...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
      <Card className="w-full max-w-sm relative shadow-xl z-10">
        <form onSubmit={handleLogin}>
          <CardHeader className="text-center pt-12">
             <div className="mb-4 flex justify-center">
              <Image src="https://i.ibb.co/yF0SYDNF/logo.png" alt="Logo" width={60} height={60} />
            </div>
            <CardTitle className="font-headline text-2xl">Plataforma SMA</CardTitle>
            <CardDescription>
              Inicie sesión para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {error && (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {error}
                    </AlertDescription>
                </Alert>
             )}
            <div className="space-y-2">
              <Label htmlFor="legajo">Legajo</Label>
              <Input 
                id="legajo" 
                type="text" 
                placeholder="Tu número de legajo" 
                required 
                value={legajo}
                onChange={(e) => setLegajo(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Tu contraseña" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
