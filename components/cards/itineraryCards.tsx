import ItineraryCard from "./itineraryCard";
import ItineraryCardCreate from "./itineraryCardCreate";
import ItinerarySkeletonCard from "./itinerarySkeletonCard";

export default function ItineraryCards({ itineraries, loading }: any) {
  return (
    <div className="h-60 flex flex-wrap gap-4">
      {loading ? (
        <ItinerarySkeletonCard />
      ) : (
        itineraries.map((itinerary: any, index: any) => (
          <ItineraryCard
            key={index}
            imageUrl={
              process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BASE_URL +
              `/storage/v1/object/public/cities/co1_c${itinerary.destination_city_id}/1.jpg`
            }
            link={`/itinerary/overview?i=${itinerary.itinerary_id}`}
            destination={itinerary?.cities?.city_name}
            startDate={itinerary?.from_date}
            endDate={itinerary?.to_date}
          />
        ))
      )}
      <ItineraryCardCreate />
    </div>
  );
}
