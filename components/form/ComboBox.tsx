"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";

export function ComboBox({ selectedValue, selections, onSelectionChange }: any) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelection = (currentValue: string) => {
    setIsOpen(false);
    onSelectionChange(currentValue);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={isOpen} className="w-[200px] justify-between">
          <div className="font-normal">
            {selectedValue ? capitalizeFirstLetterOfEachWord(selectedValue) : "Select Destination"}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandEmpty>Nothing found.</CommandEmpty>
          <CommandGroup>
            <CommandList>
              {selections?.map((item: any) => (
                <CommandItem key={item} value={item} onSelect={handleSelection}>
                  <Check className={cn("mr-2 h-4 w-4", selectedValue === item ? "opacity-100" : "opacity-0")} />
                  {capitalizeFirstLetterOfEachWord(item)}
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
