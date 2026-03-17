
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Firefighter } from '@/lib/types';
import { batchAddFirefighters } from '@/services/firefighters.service';
import Papa from 'papaparse';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, Loader2, Upload } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

// Define the required headers for the CSV file
const REQUIRED_HEADERS = ['legajo', 'nombre', 'apellido', 'rank'];

export default function ImportCsvDialog({
  children,
  onImportSuccess,
}: {
  children: React.ReactNode;
  onImportSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setLoading(false);
  }

  const handleImport = () => {
    if (!file) {
      toast({
        title: 'Error',
        description: 'Por favor, seleccione un archivo CSV para importar.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Error de sesión',
        description: 'No se pudo identificar al usuario actual.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.toLowerCase().trim(),
      complete: async (results) => {
        const headers = results.meta.fields || [];
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers?.includes(h));
        
        if (missingHeaders.length > 0) {
          toast({
            title: 'Error de formato',
            description: `El archivo CSV no contiene las columnas requeridas: ${missingHeaders.join(', ')}.`,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const firefightersToUpload = results.data.map(row => {
            const statusValue = row.status?.trim() || '';
            const isValidStatus = statusValue.toLowerCase() === 'active' || statusValue.toLowerCase() === 'inactive' || statusValue.toLowerCase() === 'auxiliar';
            const rank = row.rank.trim().toUpperCase();
            const isAspirante = rank === 'ASPIRANTE';
            
            return {
                legajo: row.legajo.trim(),
                firstName: row.nombre.trim(),
                lastName: row.apellido.trim(),
                rank: rank,
                firehouse: isAspirante ? 'Sin asignar' : (row.firehouse?.trim() || 'Sin asignar'),
                status: isValidStatus ? (statusValue.charAt(0).toUpperCase() + statusValue.slice(1).toLowerCase() as 'Active' | 'Inactive' | 'Auxiliar') : 'Active'
            } as Omit<Firefighter, 'id'>
        });
        
        if (firefightersToUpload.length === 0) {
             toast({
                title: 'Archivo vacío',
                description: 'El archivo CSV no contiene datos para importar.',
                variant: 'destructive',
            });
            setLoading(false);
            return;
        }


        try {
          await batchAddFirefighters(firefightersToUpload, user);
          toast({
            title: '¡Éxito!',
            description: `${firefightersToUpload.length} bomberos han sido importados correctamente.`,
          });
          onImportSuccess();
          resetDialog();
          setOpen(false);
        } catch (error: any) {
          console.error(error);
          toast({
            title: 'Error de importación',
            description: error.message || 'No se pudieron guardar los datos.',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        toast({
            title: 'Error al leer el archivo',
            description: `Hubo un problema al procesar el archivo CSV: ${error.message}`,
            variant: 'destructive',
        });
        setLoading(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Importar Bomberos desde CSV</DialogTitle>
          <DialogDescription>
            Seleccione un archivo .csv para cargar bomberos en lote.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
             <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Formato del Archivo</AlertTitle>
                <AlertDescription>
                    Columnas requeridas: <strong>legajo, nombre, apellido, rank</strong>. <br/>
                    La columna <strong>firehouse</strong> es opcional para Aspirantes, pero requerida para el resto.
                </AlertDescription>
            </Alert>
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="csv-file">Archivo CSV</Label>
                <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
                {file && <p className="text-sm text-muted-foreground">Archivo seleccionado: {file.name}</p>}
            </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
               <>
                <Upload className="mr-2 h-4 w-4" />
                Importar
               </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
