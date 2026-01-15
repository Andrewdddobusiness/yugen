import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowUpDown, Check, ChevronsUpDown, X, Star, DollarSign, MapPin, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { IActivityWithLocation, useActivitiesStore } from "@/store/activityStore";

interface ActivityOrderFiltersProps {
  activities: IActivityWithLocation[];
  setActivities: (activities: IActivityWithLocation[]) => void;
}

const ActivityOrderFilters: React.FC<ActivityOrderFiltersProps> = ({ activities, setActivities }) => {
  const [open, setOpen] = React.useState(false);
  const { sortOrder, setSortOrder } = useActivitiesStore();


  const orders = [
    { name: "A to Z", icon: <ArrowDownAZ size={16} />, description: "Name ascending" },
    { name: "Z to A", icon: <ArrowUpAZ size={16} />, description: "Name descending" },
    { name: "Rating High to Low", icon: <Star size={16} />, description: "Best rated first" },
    { name: "Rating Low to High", icon: <Star size={16} />, description: "Lowest rated first" },
    { name: "Price Low to High", icon: <DollarSign size={16} />, description: "Cheapest first" },
    { name: "Price High to Low", icon: <DollarSign size={16} />, description: "Most expensive first" },
    { name: "Relevance", icon: <TrendingUp size={16} />, description: "Most relevant first" },
  ];

  const handleOrderSelect = (order: string) => {
    if (sortOrder === order) {
      // Toggle off - clear sorting
      setSortOrder("");
      return;
    }
    setSortOrder(order);
  };

  const handleClearOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSortOrder("");
  };


  return (
    <div className="flex flex-row gap-2 items-center justify-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className={cn(
              "h-8 justify-start rounded-full",
              sortOrder 
                ? "border-blue-500 text-blue-700 bg-blue-50" 
                : "text-gray-500"
            )}
          >
            <span>
              <ArrowUpDown className="h-4 w-4" />
            </span>
            {sortOrder && (
              <>
                <span className="ml-2 text-xs font-medium max-w-24 truncate">
                  {sortOrder}
                </span>
                <button
                  onClick={handleClearOrder}
                  className="ml-2 hover:bg-blue-100 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            )}
            {!sortOrder && (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
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
                    <Check className={cn("mr-2 h-4 w-4", sortOrder === order.name ? "opacity-100" : "opacity-0")} />
                    <div className="flex items-center flex-1">
                      <span className="text-blue-600 mr-2">
                        {order.icon}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{order.name}</span>
                        <span className="text-xs text-gray-500">{order.description}</span>
                      </div>
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
