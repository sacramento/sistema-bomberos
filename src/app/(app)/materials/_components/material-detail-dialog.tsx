
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Material } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Truck, Warehouse, Sparkles, Tag, Check, X, Shield, FileText, HeartPulse, Ruler, Layers, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { MATERIAL_CATEGORIES } from '@/app/lib/constants/material-categories';

interface DetailItemProps {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
}

const DetailItem: React.FC<DetailItemProps> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-4">
    <Icon className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
    <div className="flex flex-col">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium text-base">{value}</span>
    </div>
  </div>
);

const getStatusBadge = (status: Material['estado']) => {
    return status === 'En Servicio'
      ? <Badge className="bg-green-100 text-green-800 border-green-200"><Check className="h-3 w-3 mr-1"/> En Servicio</Badge>
      : <Badge className="bg-red-100 text-red-800 border-red-200"><X className="h-3 w-3 mr-1"/> Fuera de Servicio</Badge>;
};

const getCondicionBadge = (condicion: Material['condicion']) => {
    switch(condicion) {
        case 'Bueno': return <Badge className="bg-green-100 text-green-800 border-green-200">Bueno</Badge>;
        case 'Regular': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Regular</Badge>;
        case 'Malo': return <Badge className="bg-red-100 text-red-800 border-red-200">Malo</Badge>;
        default: return <Badge variant="outline">{condicion}</Badge>;
    }
}

export default function MaterialDetailDialog({ material, open, onOpenChange }: { material: Material | null; open: boolean; onOpenChange: (open: boolean) => void; }) {
  if (!material) return null;

  const category = MATERIAL_CATEGORIES.find(c => c.id === material.categoryId);
  const subCategory = category?.subCategories.find(s => s.id === material.subCategoryId);
  const itemType = subCategory?.items.find(i => i.id === material.itemTypeId);

  const renderLocation = () => {
    if (material.ubicacion.type === 'vehiculo') {
      return `Móvil ${material.vehiculo?.numeroMovil || '?'} (Baulera: ${material.ubicacion.baulera})`;
    }
    return `Depósito Cuartel ${material.cuartel}`;
  };
  
  const LocationIcon = material.ubicacion.type === 'vehiculo' ? Truck : Warehouse;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">{material.nombre}</DialogTitle>
          <DialogDescription><span className="font-mono text-sm">{material.codigo}</span></DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <DetailItem icon={Layers} label="Clasificación" value={
                <div className="flex flex-col gap-1 mt-1">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-muted rounded w-fit">{category?.label}</span>
                    <span className="text-xs px-2 py-0.5 border border-muted rounded w-fit">{subCategory?.label}</span>
                    <span className="text-xs text-primary font-bold">{itemType?.label}</span>
                </div>
            } />
            
            <Separator />

            <div className="grid grid-cols-2 gap-4">
                <DetailItem icon={Tag} label="Marca" value={material.marca || 'N/A'} />
                <DetailItem icon={Tag} label="Modelo" value={material.modelo || 'N/A'} />
            </div>

            {(material.acople || material.medida) && (
                <div className="grid grid-cols-2 gap-4">
                    {material.acople && <DetailItem icon={Settings2} label="Acople" value={<Badge variant="secondary">{material.acople}</Badge>} />}
                    {material.medida && <DetailItem icon={Ruler} label="Medida" value={material.medida} />}
                </div>
            )}
            
            <Separator />

            <div className="grid grid-cols-2 gap-4">
                <DetailItem icon={Shield} label="Estado" value={getStatusBadge(material.estado)} />
                <DetailItem icon={HeartPulse} label="Condición" value={getCondicionBadge(material.condicion)} />
            </div>

            <DetailItem icon={LocationIcon} label="Ubicación" value={renderLocation()} />
            
            {material.caracteristicas && (
              <>
                <Separator />
                <DetailItem icon={FileText} label="Notas Adicionales" value={<p className="text-sm whitespace-pre-wrap text-muted-foreground">{material.caracteristicas}</p>} />
              </>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
