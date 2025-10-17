
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
import { Truck, Warehouse, Package, Sparkles, Tag, Check, X, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const getStatusClass = (status: Material['estado']) => {
    return status === 'En Servicio'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
};

const getStatusIcon = (status: Material['estado']) => {
    return status === 'En Servicio'
      ? <Check className="h-4 w-4 mr-2 text-green-600"/>
      : <X className="h-4 w-4 mr-2 text-red-600"/>;
}


export default function MaterialDetailDialog({
  material,
  open,
  onOpenChange,
}: {
  material: Material | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {

  if (!material) {
    return null;
  }

  const renderLocation = () => {
    if (material.ubicacion.type === 'vehiculo') {
      return `Móvil ${material.vehiculo?.numeroMovil || '?'} (Compartimento: ${material.ubicacion.baulera})`;
    }
    return `Depósito de ${material.ubicacion.deposito}`;
  };
  
  const LocationIcon = material.ubicacion.type === 'vehiculo' ? Truck : Warehouse;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">{material.nombre}</DialogTitle>
          <DialogDescription>
             <span className="font-mono text-sm">{material.codigo}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <DetailItem 
                icon={Package} 
                label="Tipo" 
                value={<Badge variant="outline">{material.tipo}</Badge>} 
            />
             <DetailItem 
                icon={Sparkles} 
                label="Especialidad" 
                value={<Badge variant="outline">{material.especialidad}</Badge>} 
            />
            <DetailItem 
                icon={Shield} 
                label="Estado" 
                value={
                    <Badge className={cn(getStatusClass(material.estado))}>
                        {getStatusIcon(material.estado)}
                        {material.estado}
                    </Badge>
                } 
            />
            <DetailItem
                icon={LocationIcon}
                label="Ubicación Actual"
                value={renderLocation()}
            />
            <DetailItem
                icon={Tag}
                label="Cuartel"
                value={material.cuartel}
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}
