'use client';

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { getFirefighters } from "@/services/firefighters.service";
import { db } from "@/lib/firebase/firestore";
import { writeBatch, doc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { Firefighter } from "@/lib/types";

// This is a temporary component to fix data. It can be removed after use.
export default function DataFixDialog({ children, onFixComplete }: { children: React.ReactNode; onFixComplete: () => void; }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFixNames = async () => {
    setLoading(true);
    try {
      if (!db) throw new Error("Firestore not initialized");
      
      const allFirefighters = await getFirefighters();
      if (allFirefighters.length === 0) {
        toast({ title: "Sin datos", description: "No se encontraron bomberos para corregir.", variant: "default" });
        return;
      }

      const batch = writeBatch(db);

      allFirefighters.forEach((firefighter) => {
        // Swap firstName and lastName
        const swappedData = {
          firstName: firefighter.lastName,
          lastName: firefighter.firstName,
        };
        const docRef = doc(db, "firefighters", firefighter.id);
        batch.update(docRef, swappedData);
      });

      await batch.commit();

      toast({
        title: "¡Éxito!",
        description: `Se han corregido los nombres de ${allFirefighters.length} bomberos.`,
      });
      onFixComplete(); // Refresh parent data

    } catch (error: any) {
      console.error("Data fix error:", error);
      toast({
        title: "Error en la corrección",
        description: error.message || "No se pudieron corregir los nombres. Revise la consola.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Está seguro que desea corregir los nombres?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción es irreversible. Se intentará intercambiar el nombre y el apellido para todos los bomberos en la base de datos.
            <br/><br/>
            <strong>Ejemplo:</strong> un bombero guardado como Nombre:"Pérez" y Apellido:"Juan" pasará a ser Nombre:"Juan" y Apellido:"Pérez".
            <br/><br/>
            Úselo solo si los nombres se cargaron incorrectamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleFixNames} disabled={loading} className="bg-destructive hover:bg-destructive/90">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Corrigiendo...' : 'Sí, corregir nombres'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
