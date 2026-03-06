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
import { batchAddMaterials } from '@/services/materials.service';
import Papa from 'papaparse';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, Loader2, Upload, Info, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/auth-context';

// Solo el nombre es estrictamente obligatorio para iniciar una carga de migración
const REQUIRED_HEADERS = ['nombre'];

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
        description: 'Por favor, seleccione un archivo CSV.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
        toast({ title: 'Acceso denegado', description: 'Debe iniciar sesión.', variant: 'destructive' });
        return;
    }

    setLoading(true);

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      // Normalizamos los headers para que coincidan con nuestra lógica
      transformHeader: header => header.toLowerCase().trim().replace(/\s+/g, '_').replace(/[áéíóú]/g, (c: string) => ({'á':'a','é':'e','í':'i','ó':'o','ú':'u'}[c] || c)),
      complete: async (results) => {
        const headers = results.meta.fields || [];
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          toast({
            title: 'Error de formato',
            description: `Faltan columnas obligatorias: ${missingHeaders.join(', ')}.`,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const materialsToUpload = results.data.map(row => {
            // Manejamos la ubicación de forma segura si las columnas existen
            const type = row.ubicacion_tipo?.trim().toLowerCase();
            const ubicacion = type === 'vehiculo'
                ? { type: 'vehiculo' as const, baulera: row.ubicacion_baulera?.trim() || '' }
                : { type: 'deposito' as const, deposito: row.cuartel?.trim() || '' };

            return {
                codigo: row.codigo?.trim() || '', 
                nombre: row.nombre?.trim() || 'Material sin nombre',
                categoryId: row.category_id?.trim() || '',
                subCategoryId: row.subcategory_id?.trim() || '',
                itemTypeId: row.item_type_id?.trim() || '',
                marca: row.marca?.trim() || '',
                modelo: row.modelo?.trim() || '',
                acople: row.acople?.trim() || '',
                cuartel: row.cuartel?.trim() || '',
                estado: row.estado?.trim() || 'En Servicio',
                condicion: row.condicion?.trim() || 'Bueno',
                medida: row.medida?.trim().replace(/\s/g, '').replace(',', '.') || '',
                ubicacion: ubicacion,
                caracteristicas: row.caracteristicas?.trim() || '',
                numero_movil: row.numero_movil?.trim() || ''
            };
        });
        
        if (materialsToUpload.length === 0) {
             toast({ title: 'Archivo vacío', variant: 'destructive' });
            setLoading(false);
            return;
        }

        try {
          await batchAddMaterials(materialsToUpload, user);
          toast({
            title: '¡Éxito!',
            description: `${materialsToUpload.length} materiales importados. Ya puedes completarlos individualmente.`,
          });
          onImportSuccess();
          resetDialog();
          setOpen(false);
        } catch (error: any) {
          toast({
            title: 'Error de importación',
            description: error.message,
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        toast({ title: 'Error al leer el archivo', description: error.message, variant: 'destructive' });
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
          <DialogTitle className="font-headline">Importación de Materiales</DialogTitle>
          <DialogDescription>
            Herramienta de migración rápida para cargar el inventario actual.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-4">
            <div className="space-y-4 py-4 text-sm">
                <Alert className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800 font-bold">Carga de Migración Flexible</AlertTitle>
                    <AlertDescription className="text-amber-700">
                        Solo la columna <strong>nombre</strong> es obligatoria. Puedes omitir acoples, medidas y ubicaciones en el Excel para cargarlos después con calma dentro de la app usando los selectores inteligentes.
                    </AlertDescription>
                </Alert>

                <div className="border rounded-md p-4 bg-muted/30">
                    <h4 className="font-bold mb-2">Columnas recomendadas (opcionales):</h4>
                    <code className="text-[10px] block bg-black/10 text-black p-2 rounded mb-3 overflow-x-auto whitespace-nowrap">
                        nombre, marca, modelo, estado, condicion, ubicacion_tipo, numero_movil, cuartel, caracteristicas
                    </code>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li><strong>nombre:</strong> (Obligatorio) Ej: Lanza de ataque.</li>
                        <li><strong>ubicacion_tipo:</strong> "vehiculo" o "deposito".</li>
                        <li><strong>numero_movil:</strong> Solo el número (Ej: 5).</li>
                        <li><strong>cuartel:</strong> "Cuartel 1", "Cuartel 2" o "Cuartel 3".</li>
                    </ul>
                </div>

                <div className="grid w-full items-center gap-1.5 pt-2">
                    <Label htmlFor="csv-file">Seleccionar Archivo CSV (.csv)</Label>
                    <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
                    {file && <p className="text-xs font-medium text-green-600">✓ {file.name} listo para importar.</p>}
                </div>
            </div>
        </ScrollArea>
        
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
            ) : (
               <><Upload className="mr-2 h-4 w-4" /> Importar Materiales</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
