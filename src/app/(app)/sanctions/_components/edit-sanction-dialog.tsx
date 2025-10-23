
'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Sanction } from "@/lib/types";
import { updateSanction } from "@/services/sanctions.service";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export default function EditSanctionDialog({ children, sanction, onSanctionUpdated }: { children: React.ReactNode; sanction: Sanction; onSanctionUpdated: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: parseISO(sanction.startDate),
      to: parseISO(sanction.endDate),
  });
  const [reason, setReason] = useState(sanction.reason);

  useEffect(() => {
    if (open) {
      setDateRange({
        from: parseISO(sanction.startDate),
        to: parseISO(sanction.endDate),
      });
      setReason(sanction.reason);
    }
  }, [open, sanction]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reason || !dateRange?.from || !dateRange?.to) {
        toast({
            title: "Error",
            description: "Por favor, complete todos los campos.",
            variant: "destructive",
        });
        return;
    }
    
    setLoading(true);

    try {
        const updatedSanctionData: Partial<Omit<Sanction, 'id' | 'firefighterId' | 'firefighterName'>> = {
            startDate: format(dateRange.from, 'yyyy-MM-dd'),
            endDate: format(dateRange.to, 'yyyy-MM-dd'),
            reason,
        };
        
        await updateSanction(sanction.id, updatedSanctionData);

        toast({
            title: "¡Éxito!",
            description: "La sanción ha sido actualizada.",
        });
        
        onSanctionUpdated();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error",
            description: error.message || "No se pudo actualizar la sanción.",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Editar Sanción</DialogTitle>
            <DialogDescription>
              Modifique las fechas o el motivo de la sanción.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Bombero</Label>
              <Input value={sanction.firefighterName} disabled />
            </div>
             <div className="space-y-2">
                <Label>Rango de Fechas</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                    {format(dateRange.from, "LLL dd, y", { locale: es })} -{' '}
                                    {format(dateRange.to, "LLL dd, y", { locale: es })}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y", { locale: es })
                                )
                            ) : (
                                <span>Seleccionar rango de fechas</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                            locale={es}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason-edit">Motivo de la Sanción</Label>
              <Textarea id="reason-edit" value={reason} onChange={e => setReason(e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
