import React from "react";
import ActivityCard from "./activityCard";

type ActivityCardsProps = {
  activities: any[];
  onSelectActivity: (activity: any) => void;
};

const ActivityCards: React.FC<ActivityCardsProps> = ({
  activities,
  onSelectActivity,
}) => {
  return (
    <div className="h-60 flex flex-wrap gap-4">
      {activities.map((activity: any, index: number) => (
        <ActivityCard
          key={index}
          imageUrls={activity.image_url}
          title={activity.activity_name}
          address={activity.address}
          description={activity.description}
          duration={activity.duration}
          cost={activity.activity_price}
          rating={activity.rating}
          reviews={activity.reviews}
          onClick={() => onSelectActivity(activity)}
        />
      ))}
    </div>
  );
};

export default ActivityCards;
