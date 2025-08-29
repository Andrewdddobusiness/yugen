import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowUpDown, Check, ChevronsUpDown, X, Star, DollarSign, MapPin, TrendingUp } from "lucide-react";
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
  const originalOrderRef = useRef<IActivityWithLocation[]>([]);

  // Store original order on first render or when activities change
  React.useEffect(() => {
    if (originalOrderRef.current.length === 0 || 
        originalOrderRef.current.length !== activities.length) {
      originalOrderRef.current = [...activities];
    }
  }, [activities]);

  const orders = [
    { name: "A to Z", icon: <ArrowDownAZ size={16} />, description: "Name ascending" },
    { name: "Z to A", icon: <ArrowUpAZ size={16} />, description: "Name descending" },
    { name: "Rating High to Low", icon: <Star size={16} />, description: "Best rated first" },
    { name: "Rating Low to High", icon: <Star size={16} />, description: "Lowest rated first" },
    { name: "Price Low to High", icon: <DollarSign size={16} />, description: "Cheapest first" },
    { name: "Price High to Low", icon: <DollarSign size={16} />, description: "Most expensive first" },
    { name: "Relevance", icon: <TrendingUp size={16} />, description: "Most relevant first" },
  ];

  const getPriceLevel = (priceLevel: string | undefined): number => {
    if (!priceLevel) return 0;
    // Handle both numeric strings and text formats
    if (priceLevel === "PRICE_LEVEL_INEXPENSIVE" || priceLevel === "1") return 1;
    if (priceLevel === "PRICE_LEVEL_MODERATE" || priceLevel === "2") return 2;
    if (priceLevel === "PRICE_LEVEL_EXPENSIVE" || priceLevel === "3") return 3;
    if (priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE" || priceLevel === "4") return 4;
    return parseInt(priceLevel) || 0;
  };

  const handleOrderSelect = (order: string) => {
    if (selectedOrder === order) {
      // Toggle off - restore original order
      setSelectedOrder("");
      setActivities([...originalOrderRef.current]);
      return;
    }

    setSelectedOrder(order);
    const sortedActivities = [...activities].sort((a, b) => {
      switch (order) {
        case "A to Z":
          return a.name.localeCompare(b.name);
        
        case "Z to A":
          return b.name.localeCompare(a.name);
        
        case "Rating High to Low":
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;
          if (ratingA === ratingB) {
            // Secondary sort by name if ratings are equal
            return a.name.localeCompare(b.name);
          }
          return ratingB - ratingA;
        
        case "Rating Low to High":
          const ratingA2 = a.rating || 0;
          const ratingB2 = b.rating || 0;
          if (ratingA2 === ratingB2) {
            return a.name.localeCompare(b.name);
          }
          return ratingA2 - ratingB2;
        
        case "Price Low to High":
          const priceA = getPriceLevel(a.price_level);
          const priceB = getPriceLevel(b.price_level);
          if (priceA === priceB) {
            return a.name.localeCompare(b.name);
          }
          return priceA - priceB;
        
        case "Price High to Low":
          const priceA2 = getPriceLevel(a.price_level);
          const priceB2 = getPriceLevel(b.price_level);
          if (priceA2 === priceB2) {
            return a.name.localeCompare(b.name);
          }
          return priceB2 - priceA2;
        
        case "Relevance":
          // Sort by rating first, then by name as a tiebreaker
          const relevanceA = (a.rating || 0) * 10 + (a.name.length < 30 ? 5 : 0);
          const relevanceB = (b.rating || 0) * 10 + (b.name.length < 30 ? 5 : 0);
          if (relevanceA === relevanceB) {
            return a.name.localeCompare(b.name);
          }
          return relevanceB - relevanceA;
        
        default:
          return 0;
      }
    });
    
    setActivities(sortedActivities);
  };

  const handleClearOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrder("");
    setActivities([...originalOrderRef.current]);
  };

  const selectedOrderInfo = orders.find(order => order.name === selectedOrder);

  return (
    <div className="flex flex-row gap-2 items-center justify-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className={cn(
              "h-8 justify-start rounded-full",
              selectedOrder 
                ? "border-blue-500 text-blue-700 bg-blue-50" 
                : "text-gray-500"
            )}
          >
            <span>
              <ArrowUpDown className="h-4 w-4" />
            </span>
            {selectedOrder && (
              <>
                <span className="ml-2 text-xs font-medium max-w-24 truncate">
                  {selectedOrder}
                </span>
                <button
                  onClick={handleClearOrder}
                  className="ml-2 hover:bg-blue-100 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            )}
            {!selectedOrder && (
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
                    <Check className={cn("mr-2 h-4 w-4", selectedOrder === order.name ? "opacity-100" : "opacity-0")} />
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
