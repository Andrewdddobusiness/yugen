import React from "react";

import { useActivitiesStore } from "@/store/activityStore";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MdMoneyOff, MdAttachMoney } from "react-icons/md";
import { Check, ChevronsUpDown, CircleDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const ActivityCostFilters: React.FC = () => {
  const { selectedCostFilters, setSelectedCostFilters } = useActivitiesStore();
  const [open, setOpen] = React.useState(false);

  const filters = [
    { name: "Free", icon: <MdMoneyOff size={16} /> },
    { name: "Paid", icon: <MdAttachMoney size={16} /> },
  ];

  const handleFilterSelect = (filter: string) => {
    setSelectedCostFilters((prevFilters: string[]) => {
      if (prevFilters.includes(filter)) {
        return prevFilters.filter((f) => f !== filter);
      } else {
        return [...prevFilters, filter];
      }
    });
  };

  return (
    <div className="flex flex-row gap-2 items-center justify-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8 justify-start rounded-full text-gray-500">
            <span>
              <CircleDollarSign className="h-4 w-4" />
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search cost..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {filters.map((filter) => (
                  <CommandItem
                    key={filter.name}
                    onSelect={() => {
                      handleFilterSelect(filter.name);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCostFilters.includes(filter.name) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center">
                      {filter.icon}
                      <span className="ml-2">{filter.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ActivityCostFilters;
