import ActivityCard from "./activityCard";
import { itineraryData } from "./data";

export default function ActivityCards() {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 4xl:grid-cols-8 5xl:grid-cols-9 6xl:grid-cols-10 gap-4">
      {itineraryData.map((itinerary, index) => (
        <ActivityCard
          key={index}
          imageUrls={itinerary.imageUrls}
          title={itinerary.title}
          address={itinerary.address}
          description={itinerary.description}
          duration={itinerary.duration}
          cost={itinerary.cost}
          rating={itinerary.rating}
          reviews={itinerary.reviews}
        />
      ))}
    </div>
  );
}
