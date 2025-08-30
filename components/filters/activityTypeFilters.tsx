import React from "react";
import { Toggle } from "@/components/ui/toggle";
import { useActivitiesStore } from "@/store/activityStore";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";

const ActivityTypeFilters: React.FC = () => {
  const { selectedFilters, setSelectedFilters } = useActivitiesStore();
  const [open, setOpen] = React.useState(false);

  const filters = ["Food", "Shopping", "Historical"];

  const handleFilterSelect = (filter: string) => {
    setSelectedFilters((prevFilters: string[]) => {
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
              <ListFilter className="h-4 w-4" />
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search type..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {filters.map((filter) => (
                  <CommandItem
                    key={filter}
                    onSelect={() => {
                      handleFilterSelect(filter);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", selectedFilters.includes(filter) ? "opacity-100" : "opacity-0")}
                    />
                    {filter}
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

export default ActivityTypeFilters;
