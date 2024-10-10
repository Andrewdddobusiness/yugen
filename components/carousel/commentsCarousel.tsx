import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import Rating from "../rating/rating";
import Link from "next/link";
import { formatDateTime } from "@/utils/formatting/time";

interface Review {
  author_name: string;
  text: { text: string };
  rating: number;
  authorAttribution: {
    uri: string;
    displayName: string;
  };
  publishTime: string;
}

interface CommentsCarouselProps {
  reviews: Review[];
}

const CommentsCarousel: React.FC<CommentsCarouselProps> = ({ reviews }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(
    new Set()
  );

  const nextReview = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % reviews.length);
  };

  const prevReview = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + reviews.length) % reviews.length
    );
  };

  const toggleExpand = (index: number) => {
    const newExpandedReviews = new Set(expandedReviews);
    if (expandedReviews.has(index)) {
      newExpandedReviews.delete(index);
    } else {
      newExpandedReviews.add(index);
    }
    setExpandedReviews(newExpandedReviews);
  };

  if (!reviews || reviews.length === 0) {
    return <div>No reviews available.</div>;
  }

  const review = reviews[currentIndex];
  const isExpanded = expandedReviews.has(currentIndex);
  const reviewText = review.text.text;
  const shouldTruncate = reviewText.length > 200;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Reviews</h3>
      </div>
      <div className="flex flex-row justify-between items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={prevReview}
          className="p-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="font-medium">{review.author_name}</p>
          <div
            className={`text-sm text-zinc-500 italic ${
              isExpanded ? "" : "line-clamp-4"
            }`}
          >
            {reviewText}
          </div>
          {shouldTruncate && (
            <button
              className="text-blue-500 hover:text-blue-700 text-sm mt-1"
              onClick={() => toggleExpand(currentIndex)}
            >
              {isExpanded ? "See less" : "See more"}
            </button>
          )}
          <div className="flex flex-row items-center gap-2">
            <Rating rating={review.rating} />
            <p className="text-xs text-gray-500">{review.rating}.0</p>
          </div>
          <Link
            className="text-sm hover:underline text-blue-500 hover:text-blue-700"
            href={review.authorAttribution.uri}
          >
            {review.authorAttribution.displayName} - Google Review
          </Link>
          <p className="text-xs text-gray-500">
            {formatDateTime(review.publishTime)}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={nextReview}
          className="p-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default CommentsCarousel;
