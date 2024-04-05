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

export default function ItineraryCards() {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 4xl:grid-cols-8 5xl:grid-cols-9 6xl:grid-cols-10 gap-4">
      {itineraryData.map((itinerary, index) => (
        <ItineraryCard
          key={index}
          link={itinerary.link}
          imageUrl={itinerary.imageUrl}
          destination={itinerary.destination}
          startDate={itinerary.startDate}
          endDate={itinerary.endDate}
        />
      ))}
      <ItineraryCardCreate />
    </div>
  );
}
