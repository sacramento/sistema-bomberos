
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
import { useState, useEffect, useMemo } from "react";
import { Firefighter, Sanction } from "@/lib/types";
import { getFirefighters } from "@/services/firefighters.service";
import { addSanction } from "@/services/sanctions.service";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AddSanctionDialog({ children, onSanctionAdded }: { children: React.ReactNode; onSanctionAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  const [selectedFirefighter, setSelectedFirefighter] = useState<Firefighter | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState('');

  const [openCombobox, setOpenCombobox] = useState(false);

  const activeFirefighters = useMemo(() => allFirefighters.filter(f => f.status === 'Active'), [allFirefighters]);

  useEffect(() => {
    const fetchAllFirefighters = async () => {
        if (open) {
            try {
                const data = await getFirefighters();
                setAllFirefighters(data);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los bomberos.",
                    variant: "destructive"
                });
            }
        }
    };
    fetchAllFirefighters();
  }, [open, toast]);

  const resetForm = () => {
    setSelectedFirefighter(null);
    setDateRange(undefined);
    setReason('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFirefighter || !reason || !dateRange?.from || !dateRange?.to) {
        toast({
            title: "Error",
            description: "Por favor, complete todos los campos.",
            variant: "destructive",
        });
        return;
    }
    
    setLoading(true);

    try {
        const newSanctionData: Omit<Sanction, 'id'> = {
            firefighterId: selectedFirefighter.id,
            firefighterName: `${selectedFirefighter.firstName} ${selectedFirefighter.lastName}`,
            startDate: format(dateRange.from, 'yyyy-MM-dd'),
            endDate: format(dateRange.to, 'yyyy-MM-dd'),
            reason,
        };
        
        await addSanction(newSanctionData);

        toast({
            title: "¡Éxito!",
            description: "La sanción ha sido registrada.",
        });
        
        onSanctionAdded();
        resetForm();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error",
            description: error.message || "No se pudo registrar la sanción.",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Registrar Nueva Sanción</DialogTitle>
            <DialogDescription>
              Seleccione el bombero, las fechas y el motivo de la sanción.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firefighter">Bombero</Label>
               <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                        <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCombobox}
                        className="w-full justify-between"
                        >
                        {selectedFirefighter
                            ? `${selectedFirefighter.firstName} ${selectedFirefighter.lastName}`
                            : "Seleccionar integrante..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                        <CommandInput placeholder="Buscar integrante..." />
                        <CommandList>
                            <CommandEmpty>No se encontró el integrante.</CommandEmpty>
                            {activeFirefighters.map((firefighter) => (
                            <CommandItem
                                key={firefighter.id}
                                value={`${firefighter.legajo} ${firefighter.firstName} ${firefighter.lastName}`}
                                onSelect={() => {
                                    setSelectedFirefighter(firefighter);
                                    setOpenCombobox(false);
                                }}
                            >
                                <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedFirefighter?.id === firefighter.id ? "opacity-100" : "opacity-0"
                                )}
                                />
                                {`${firefighter.legajo} - ${firefighter.firstName} ${firefighter.lastName}`}
                            </CommandItem>
                            ))}
                        </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
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
              <Label htmlFor="reason">Motivo de la Sanción</Label>
              <Textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} required placeholder="Describa el motivo de la sanción..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Sanción'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
