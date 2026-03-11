'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Firefighter } from "@/lib/types";

interface SingleSelectProps {
  title: string;
  selected: Firefighter | null;
  onSelectedChange: (firefighter: Firefighter | null) => void;
  firefighters: Firefighter[];
  disabled?: boolean;
}

export function SingleFirefighterSelect({
  title,
  selected,
  onSelectedChange,
  firefighters,
  disabled = false
}: SingleSelectProps) {
  const [open, setOpen] = React.useState(false);

  const getDisplayText = (f: Firefighter) => `${f.legajo} - ${f.lastName}, ${f.firstName}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 text-left text-xs"
          disabled={disabled}
        >
          <span className="truncate">
            {selected ? getDisplayText(selected) : `Seleccionar ${title.toLowerCase()}...`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Buscar por legajo o apellido...`} />
          <CommandList>
            <CommandEmpty>No se encontraron integrantes.</CommandEmpty>
            <CommandGroup>
              {firefighters.map((firefighter) => (
                <CommandItem
                  key={firefighter.id}
                  value={`${firefighter.legajo} ${firefighter.lastName} ${firefighter.firstName}`}
                  onSelect={() => {
                    onSelectedChange(firefighter);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected?.id === firefighter.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {getDisplayText(firefighter)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface MultiSelectProps {
  title: string;
  selected: Firefighter[];
  onSelectedChange: (selected: Firefighter[]) => void;
  firefighters: Firefighter[];
  disabledIds?: string[];
  disabled?: boolean;
}

export function MultiFirefighterSelect({
  title,
  selected,
  onSelectedChange,
  firefighters,
  disabledIds = [],
  disabled = false
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (firefighter: Firefighter) => {
    if (disabledIds.includes(firefighter.id)) return;
    const isSelected = selected.some(s => s.id === firefighter.id);
    if (isSelected) {
      onSelectedChange(selected.filter(s => s.id !== firefighter.id));
    } else {
      onSelectedChange([...selected, firefighter]);
    }
  };

  const getDisplayText = (f: Firefighter) => `${f.legajo} - ${f.lastName}, ${f.firstName}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 text-left"
          disabled={disabled}
        >
          <div className="flex gap-1 flex-wrap">
            {selected.length > 0 ? (
              selected.map(f => (
                <Badge variant="secondary" key={f.id} className="text-[10px]">
                  {getDisplayText(f)}
                </Badge>
              ))
            ) : (
              `Seleccionar ${title.toLowerCase()}...`
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Buscar por legajo o apellido...`} />
          <CommandList>
            <CommandEmpty>No se encontraron integrantes.</CommandEmpty>
            <CommandGroup>
              {firefighters.map((firefighter) => (
                <CommandItem
                  key={firefighter.id}
                  value={`${firefighter.legajo} ${firefighter.firstName} ${firefighter.lastName}`}
                  onSelect={() => handleSelect(firefighter)}
                  disabled={disabledIds.includes(firefighter.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.some(s => s.id === firefighter.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {getDisplayText(firefighter)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}