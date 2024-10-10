import React from "react";
import { Toggle } from "@/components/ui/toggle";

interface ActivityFiltersProps {
  selectedFilter: string;
  setSelectedFilter: (filter: string) => void;
}

const ActivityFilters: React.FC<ActivityFiltersProps> = ({
  selectedFilter,
  setSelectedFilter,
}) => {
  const filters = ["Food", "Historical", "Shopping"];

  return (
    <div className="flex space-x-2 mb-4">
      {filters.map((filter) => (
        <Toggle
          key={filter}
          variant={"outline"}
          className="h-8 rounded-full ml-2"
          onClick={() => setSelectedFilter(filter)}
        >
          {filter}
        </Toggle>
      ))}
    </div>
  );
};

export default ActivityFilters;
