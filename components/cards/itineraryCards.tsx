import ItineraryCard from "./itineraryCard";
import ItineraryCardCreate from "./itineraryCardCreate";

// Sample JSON data
const itineraryData = [
  {
    link: "itinerary/1/overview",
    imageUrl: "/map.jpg",
    destination: "Bali, Indonesia",
    startDate: "25 Mar 2024",
    endDate: "28 Mar 2024",
  },
];

export default function ItineraryCards({ itineraries }: any) {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 4xl:grid-cols-8 5xl:grid-cols-9 6xl:grid-cols-10 gap-4">
      {itineraries.map((itinerary: any, index: any) => (
        <ItineraryCard
          key={index}
          imageUrl={
            process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BASE_URL +
            `/storage/v1/object/public/cities/co1_c${itinerary.destination_city_id}/1.jpg`
          }
          link={`/itinerary/${itinerary.itinerary_id}/overview`}
          destination={itinerary?.cities?.city_name}
          startDate={itinerary?.from_date}
          endDate={itinerary?.to_date}
        />
      ))}
      <ItineraryCardCreate />
    </div>
  );
}
