import FullStar from "@/components/rating/fullStar";
import EmptyStar from "@/components/rating/emptyStar";

interface RatingProps {
  rating: number;
}

const Rating = ({ rating }: RatingProps) => {
  // Calculate the number of full and empty stars
  const fullStars = Math.round(rating);

  // Create an array to render the stars
  const stars = [];

  // Add full stars
  for (let i = 0; i < fullStars; i++) {
    stars.push(<FullStar key={i} />);
  }

  // Add empty stars
  for (let i = fullStars; i < 5; i++) {
    stars.push(<EmptyStar key={`empty-${i}`} />);
  }

  return <div className="flex items-center">{stars}</div>;
};

export default Rating;
