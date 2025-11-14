
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

const REQUIRED_HEADERS = ['code', 'category', 'subcategory', 'type', 'size', 'state'];

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
                code: row.code.trim(),
                category: row.category.trim(),
                subCategory: row.subcategory.trim(),
                type: row.type.trim(),
                size: row.size.trim(),
                state: row.state.trim(),
                brand: row.brand?.trim() || undefined,
                model: row.model?.trim() || undefined,
                observations: row.observations?.trim() || undefined,
                firefighterLegajo: row.firefighter_legajo?.trim() || undefined,
            } as Omit<ClothingItem, 'id' | 'firefighter' | 'firefighterId'> & { firefighterLegajo?: string };
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
            Seleccione un archivo .csv para cargar prendas en lote.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
             <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Formato del Archivo</AlertTitle>
                <AlertDescription>
                    El archivo CSV debe contener las columnas: <strong>code, category, subcategory, type, size, state</strong>.
                    <p className="mt-2 text-xs">Opcionalmente puede incluir: <strong>brand, model, observations, firefighter_legajo</strong>.</p>
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
