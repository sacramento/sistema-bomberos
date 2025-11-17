
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClothingItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Shirt, Warehouse, Package, Sparkles, Tag, Check, X, Shield, FileText, HeartPulse, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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

const getStateBadge = (state: ClothingItem['state']) => {
    switch(state) {
        case 'Nuevo': return <Badge variant="default" className="bg-sky-500">Nuevo</Badge>;
        case 'Bueno': return <Badge variant="default" className="bg-green-600">Bueno</Badge>;
        case 'Regular': return <Badge variant="secondary" className="bg-yellow-500 text-black">Regular</Badge>;
        case 'Malo': return <Badge variant="destructive" className="bg-orange-600">Malo</Badge>;
        case 'Baja': return <Badge variant="destructive">Baja</Badge>;
        default: return <Badge variant="outline">{state}</Badge>;
    }
}


export default function ClothingDetailDialog({
  item,
  open,
  onOpenChange,
}: {
  item: ClothingItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {

  if (!item) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">{item.type}</DialogTitle>
          <DialogDescription>
             <span className="font-mono text-sm">{item.code}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <DetailItem icon={Package} label="Categoría" value={<Badge variant="outline">{item.category} / {item.subCategory}</Badge>} />
            <DetailItem icon={Tag} label="Talle" value={item.size} />
            <DetailItem icon={Shield} label="Estado" value={getStateBadge(item.state)} />

            <Separator />
            
             <DetailItem 
                icon={User} 
                label="Asignado a" 
                value={item.firefighter ? `${item.firefighter.lastName}, ${item.firefighter.firstName}` : 'En Depósito'}
            />

            {(item.brand || item.model || item.observations) && <Separator />}

            {item.brand && <DetailItem icon={Sparkles} label="Marca" value={item.brand} />}
            {item.model && <DetailItem icon={Sparkles} label="Modelo" value={item.model} />}
            {item.observations && (
                <DetailItem
                    icon={FileText}
                    label="Observaciones"
                    value={<p className="text-sm whitespace-pre-wrap">{item.observations}</p>}
                />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
