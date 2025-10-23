
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
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { Firefighter, Leave, LeaveType } from "@/lib/types";
import { getFirefighters } from "@/services/firefighters.service";
import { addLeave } from "@/services/leaves.service";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Calendar as CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from "@/context/auth-context";

const allLeaveTypes: LeaveType[] = ['Ordinaria', 'Extraordinaria', 'Enfermedad', 'Estudio', 'Maternidad'];

export default function AddLeaveDialog({ children, onLeaveAdded }: { children: React.ReactNode; onLeaveAdded: () => void; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
  const [selectedFirefighter, setSelectedFirefighter] = useState<Firefighter | null>(null);
  const [leaveType, setLeaveType] = useState<LeaveType | ''>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [openCombobox, setOpenCombobox] = useState(false);

  const availableLeaveTypes = allLeaveTypes;

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
    setLeaveType('');
    setDateRange(undefined);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFirefighter || !leaveType || !dateRange?.from || !dateRange?.to) {
        toast({
            title: "Error",
            description: "Por favor, complete todos los campos.",
            variant: "destructive",
        });
        return;
    }
    
    setLoading(true);

    try {
        const newLeaveData: Omit<Leave, 'id'> = {
            firefighterId: selectedFirefighter.id,
            firefighterName: `${selectedFirefighter.firstName} ${selectedFirefighter.lastName}`,
            type: leaveType as LeaveType,
            startDate: format(dateRange.from, 'yyyy-MM-dd'),
            endDate: format(dateRange.to, 'yyyy-MM-dd'),
        };
        
        await addLeave(newLeaveData);

        toast({
            title: "¡Éxito!",
            description: "La licencia ha sido registrada y las ausencias han sido justificadas.",
        });
        
        onLeaveAdded();
        resetForm();
        setOpen(false);

    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error",
            description: error.message || "No se pudo registrar la licencia.",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
  }

  const leaveDays = dateRange?.from && dateRange.to
    ? differenceInCalendarDays(dateRange.to, dateRange.from) + 1
    : 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline">Registrar Nueva Licencia</DialogTitle>
            <DialogDescription>
              Seleccione el bombero, tipo de licencia y el rango de fechas.
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
              <Label htmlFor="leaveType">Tipo de Licencia</Label>
              <Select onValueChange={(value) => setLeaveType(value as LeaveType)} value={leaveType} required>
                <SelectTrigger id="leaveType">
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {availableLeaveTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                {user?.role === 'Ayudantía' && leaveDays > 0 && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                        Total de días de licencia: <span className="font-bold">{leaveDays}</span>
                    </p>
                )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Licencia'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
