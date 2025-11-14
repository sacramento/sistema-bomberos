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
import { ClothingItem } from '@/lib/types';
import { batchAddClothingItems } from '@/services/clothing.service';
import Papa from 'papaparse';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, Loader2, Upload } from 'lucide-react';

const REQUIRED_HEADERS = ['codigo', 'categoria', 'subcategoria', 'tipo', 'talle', 'estado', 'legajo_bombero'];

export default function ImportClothingDialog({
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

        const clothingToUpload = results.data.map(row => {
            return {
                codigo: row.codigo.trim(),
                categoria: row.categoria.trim(),
                subcategoria: row.subcategoria.trim(),
                tipo: row.tipo.trim(),
                talle: row.talle.trim(),
                estado: row.estado.trim(),
                marca: row.marca?.trim() || undefined,
                modelo: row.modelo?.trim() || undefined,
                observaciones: row.observaciones?.trim() || undefined,
                legajo_bombero: row.legajo_bombero?.trim() || undefined,
            }
        });
        
        if (clothingToUpload.length === 0) {
             toast({
                title: 'Archivo vacío',
                description: 'El archivo CSV no contiene datos para importar.',
                variant: 'destructive',
            });
            setLoading(false);
            return;
        }

        try {
          await batchAddClothingItems(clothingToUpload);
          toast({
            title: '¡Éxito!',
            description: `${clothingToUpload.length} prendas han sido importadas correctamente.`,
          });
          onImportSuccess();
          resetDialog();
          setOpen(false);
        } catch (error: any) {
          console.error(error);
          toast({
            title: 'Error de importación',
            description: error.message || 'No se pudieron guardar los datos. Revise la consola para más detalles.',
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
          <DialogTitle className="font-headline">Importar Prendas desde CSV</DialogTitle>
          <DialogDescription>
            Seleccione un archivo .csv para cargar prendas en lote. El orden de las columnas no importa, solo los títulos.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
             <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Formato del Archivo</AlertTitle>
                <AlertDescription>
                    <p>Los títulos de las columnas deben ser exactos y en minúscula (sin tildes). El orden de las columnas no afecta la importación.</p>
                    <p className='mt-2'><strong>Columnas obligatorias:</strong> codigo, categoria, subcategoria, tipo, talle, estado, legajo_bombero.</p>
                    <p className='mt-1'><strong>Columnas opcionales:</strong> marca, modelo, observaciones.</p>
                    <p className="mt-2 text-xs">Para prendas en depósito, la columna `legajo_bombero` debe estar presente pero la celda puede quedar vacía.</p>
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
