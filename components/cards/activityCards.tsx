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
    <div className="h-60 flex flex-wrap gap-4 p-4">
      {activities.map((activity: any, index: number) => (
        <ActivityCard
          key={index}
          imageUrl={`https://places.googleapis.com/v1/${activity.photos[0].name}/media?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&maxHeightPx=1000&maxWidthPx=1000`}
          title={activity.displayName.text}
          address={activity.formattedAddress}
          description={activity.editorialSummary?.text || ""}
          priceLevel={activity.priceLevel}
          rating={activity.rating}
          types={activity.types}
          onClick={() => onSelectActivity(activity)}
        />
      ))}
    </div>
  );
};

export default ActivityCards;
