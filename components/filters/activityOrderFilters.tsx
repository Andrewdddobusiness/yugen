import React from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowUpDown, Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/components/lib/utils";
import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { IActivityWithLocation } from "@/store/activityStore";

interface ActivityOrderFiltersProps {
  activities: IActivityWithLocation[];
  setActivities: (activities: IActivityWithLocation[]) => void;
}

const ActivityOrderFilters: React.FC<ActivityOrderFiltersProps> = ({ activities, setActivities }) => {
  const [open, setOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<string>("");

  const orders = [
    { name: "A to Z", icon: <ArrowDownAZ size={16} /> },
    { name: "Z to A", icon: <ArrowUpAZ size={16} /> },
  ];

  const handleOrderSelect = (order: string) => {
    if (selectedOrder === order) {
      setSelectedOrder("");
      setActivities([...activities]);
      return;
    }

    setSelectedOrder(order);
    const sortedActivities = [...activities].sort((a, b) => {
      if (order === "A to Z") {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });
    setActivities(sortedActivities);
  };

  const handleClearOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrder("");
    setActivities([...activities]);
  };

  return (
    <div className="flex flex-row gap-2 items-center justify-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8 justify-start rounded-full text-gray-500">
            <span>
              <ArrowUpDown className="h-4 w-4" />
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Sort by..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {orders.map((order) => (
                  <CommandItem
                    key={order.name}
                    onSelect={() => {
                      handleOrderSelect(order.name);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", selectedOrder === order.name ? "opacity-100" : "opacity-0")} />
                    <div className="flex items-center">
                      {order.icon}
                      <span className="ml-2">{order.name}</span>
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

export default ActivityOrderFilters;
