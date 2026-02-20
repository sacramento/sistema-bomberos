
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
import { Material } from '@/lib/types';
import { batchAddMaterials } from '@/services/materials.service';
import Papa from 'papaparse';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, Loader2, Upload } from 'lucide-react';

const REQUIRED_HEADERS = [
    'codigo', 'nombre', 'tipo', 'especialidad', 'cuartel', 'estado', 
    'condicion', 'ubicacion_tipo', 'numero_movil', 'ubicacion_baulera', 'caracteristicas'
];

export default function ImportMaterialsDialog({
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

    setLoading(true);

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.toLowerCase().trim().replace(/\s+/g, '_'),
      complete: async (results) => {
        const headers = results.meta.fields || [];
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          toast({
            title: 'Error de formato',
            description: `El archivo CSV no contiene las columnas requeridas: ${missingHeaders.join(', ')}.`,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const materialsToUpload = results.data.map(row => {
            const ubicacion = row.ubicacion_tipo === 'vehiculo'
                ? { type: 'vehiculo' as const, baulera: row.ubicacion_baulera }
                : { type: 'deposito' as const, deposito: row.cuartel };

            return {
                codigo: row.codigo?.trim() || '', // Can be empty for auto-generation
                nombre: row.nombre.trim(),
                tipo: row.tipo.trim(),
                especialidad: row.especialidad.trim(),
                cuartel: row.cuartel.trim(),
                estado: row.estado.trim(),
                condicion: row.condicion.trim(),
                ubicacion: ubicacion,
                caracteristicas: row.caracteristicas?.trim() || '',
                numero_movil: row.numero_movil?.trim() || ''
            } as Omit<Material, 'id' | 'vehiculo'> & { numero_movil?: string };
        });
        
        if (materialsToUpload.length === 0) {
             toast({
                title: 'Archivo vacío',
                description: 'El archivo CSV no contiene datos para importar.',
                variant: 'destructive',
            });
            setLoading(false);
            return;
        }


        try {
          await batchAddMaterials(materialsToUpload);
          toast({
            title: '¡Éxito!',
            description: `${materialsToUpload.length} materiales han sido procesados e importados.`,
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Importar Materiales desde CSV</DialogTitle>
          <DialogDescription>
            Seleccione un archivo .csv para cargar materiales en lote.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
             <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Formato Inteligente</AlertTitle>
                <AlertDescription>
                    <p><strong>Códigos Automáticos:</strong> Si dejas la columna `codigo` vacía, el sistema generará automáticamente códigos de 3 dígitos (ej: REHA001) basados en el Tipo y Especialidad.</p>
                    <p className='mt-2'><strong>Columnas obligatorias:</strong> {REQUIRED_HEADERS.join(', ')}.</p>
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
                Procesando...
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
