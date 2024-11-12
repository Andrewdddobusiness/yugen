import React from "react";
import { Toggle } from "@/components/ui/toggle";
import { useActivitiesStore } from "@/store/activityStore";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/components/lib/utils";

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
    <>
      {/* Toggle buttons for larger screens */}
      {/* <div className="hidden lg:flex space-x-2">
        {filters.map((filter) => (
          <Toggle
            key={filter}
            variant="outline"
            className="h-8 bg-white rounded-full ml-2 w-20"
            pressed={selectedFilters.includes(filter)}
            onPressedChange={() => handleFilterSelect(filter)}
          >
            {filter}
          </Toggle>
        ))}
      </div> */}

      {/* Combobox for small screens */}
      <div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 justify-start rounded-full">
              {selectedFilters.length > 0 ? selectedFilters.join(", ") : "Select type"}
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
    </>
  );
};

export default ActivityTypeFilters;
