import React, { forwardRef } from "react";
import { DateGroup } from "./dateGroup";
import { format } from "date-fns";

interface DateGroupWrapperProps {
  date: Date;
  activities: any[];
  isUnscheduled: boolean;
  index: number;
  onDateUpdate: (activityId: number, newDate: string | null) => void;
  activeId: string | null;
  overDateId: string | null;
  overItemId: string | null;
}

const DateGroupWrapper = forwardRef<HTMLDivElement, DateGroupWrapperProps>(
  (props, ref) => {
    const {
      date,
      activities,
      isUnscheduled,
      index,
      onDateUpdate,
      activeId,
      overDateId,
      overItemId,
      ...rest
    } = props;

    // Don't render if the date is "9999-12-31"
    if (format(date, "yyyy-MM-dd") === "9999-12-31") {
      return null;
    }

    return (
      <div ref={ref} {...rest}>
        <DateGroup
          date={date}
          activities={activities}
          isUnscheduled={isUnscheduled}
          index={index}
          activeId={activeId}
          overDateId={overDateId}
          overItemId={overItemId}
        />
      </div>
    );
  }
);

DateGroupWrapper.displayName = "DateGroupWrapper";

export { DateGroupWrapper };
