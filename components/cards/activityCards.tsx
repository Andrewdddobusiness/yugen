import React from "react";
import ActivityCard from "./activityCard";
import { IActivity } from "@/store/activityStore";

interface IActivityCardsProps {
  activities: IActivity[];
  onSelectActivity: (activity: any) => void;
  onHover: (activity: any) => void;
}

const ActivityCards: React.FC<IActivityCardsProps> = ({
  activities,
  onSelectActivity,
  onHover,
}) => {
  return (
    <div className="h-60 flex flex-wrap gap-4 p-4">
      {activities.map((activity: IActivity, index: number) => (
        <ActivityCard
          key={index}
          activity={activity}
          onClick={() => onSelectActivity(activity)}
        />
      ))}
    </div>
  );
};

export default ActivityCards;
