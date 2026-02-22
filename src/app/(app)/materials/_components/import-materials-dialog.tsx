
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
import { FileText, Loader2, Upload, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const REQUIRED_HEADERS = [
    'codigo', 'nombre', 'tipo', 'especialidad', 'cuartel', 'estado', 
    'condicion', 'medida', 'ubicacion_tipo', 'numero_movil', 'ubicacion_baulera', 'caracteristicas'
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
            const ubicacion = row.ubicacion_tipo?.trim().toLowerCase() === 'vehiculo'
                ? { type: 'vehiculo' as const, baulera: row.ubicacion_baulera?.trim() }
                : { type: 'deposito' as const, deposito: row.cuartel?.trim() };

            return {
                codigo: row.codigo?.trim() || '', 
                nombre: row.nombre?.trim() || '',
                tipo: row.tipo?.trim().toUpperCase() || '',
                especialidad: row.especialidad?.trim().toUpperCase() || '',
                cuartel: row.cuartel?.trim() || '',
                estado: row.estado?.trim() || 'En Servicio',
                condicion: row.condicion?.trim() || 'Bueno',
                medida: row.medida?.trim().replace(/\s/g, '') || '',
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
          await batchAddMaterials(materialsToUpload, { id: 'admin', name: 'Admin', role: 'Master', roles: { asistencia: 'Administrador', aspirantes: 'Administrador', semanas: 'Administrador', movilidad: 'Administrador', materiales: 'Administrador', ayudantia: 'Administrador', roperia: 'Administrador', servicios: 'Administrador', cascada: 'Administrador' } });
          toast({
            title: '¡Éxito!',
            description: `${materialsToUpload.length} materiales han sido procesados e importados correctamente.`,
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Importar Materiales (Carga Masiva)</DialogTitle>
          <DialogDescription>
            Configure su Excel con estos valores exactos para asegurar una carga exitosa.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-4">
            <div className="space-y-4 py-4 text-sm">
                <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 font-bold">Encabezados Exactos (Fila 1)</AlertTitle>
                    <AlertDescription className="text-blue-700">
                        <code className="text-[10px] block bg-black/10 text-black p-2 rounded mt-2 overflow-x-auto whitespace-nowrap">
                            codigo, nombre, tipo, especialidad, cuartel, estado, condicion, medida, ubicacion_tipo, numero_movil, ubicacion_baulera, caracteristicas
                        </code>
                    </AlertDescription>
                </Alert>

                <div className="border rounded-md p-4 bg-muted/30">
                    <h4 className="font-bold mb-2">Valores Permitidos para Listas Desplegables:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div>
                            <p className="font-semibold text-primary">Estado:</p>
                            <p>En Servicio, Fuera de Servicio</p>
                        </div>
                        <div>
                            <p className="font-semibold text-primary">Condición:</p>
                            <p>Bueno, Regular, Malo</p>
                        </div>
                        <div>
                            <p className="font-semibold text-primary">Cuartel:</p>
                            <p>Cuartel 1, Cuartel 2, Cuartel 3</p>
                        </div>
                        <div>
                            <p className="font-semibold text-primary">Ubicación Tipo:</p>
                            <p>deposito, vehiculo</p>
                        </div>
                        <div>
                            <p className="font-semibold text-primary">Medida (Columna 'medida'):</p>
                            <p>25mm, 38mm, 44.5mm, 63.5mm, 70mm</p>
                        </div>
                    </div>
                </div>

                <div className="grid w-full items-center gap-1.5 pt-2">
                    <Label htmlFor="csv-file">Seleccionar Archivo CSV</Label>
                    <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
                    {file && <p className="text-xs font-medium text-green-600">✓ {file.name} seleccionado.</p>}
                </div>
            </div>
        </ScrollArea>
        
        <DialogFooter className="border-t pt-4">
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
                Comenzar Importación
               </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
