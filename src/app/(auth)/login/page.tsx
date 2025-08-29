'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { Flame } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { user, login, loading, error } = useAuth();
  const { toast } = useToast();
  const [legajo, setLegajo] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ legajo, password });
  };
  
  useEffect(() => {
    if (error) {
       toast({
        title: "Error de autenticación",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Prevent rendering the form if auth state is loading or user is already logged in
  // This avoids hydration errors caused by redirection logic in AuthProvider
  if (loading || user) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Cargando...</p>
        </div>
    );
  }

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
