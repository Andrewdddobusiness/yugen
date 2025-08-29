// components/InfiniteScroll.tsx
import { useEffect, useRef } from "react";

interface InfiniteScrollProps {
  loadMore: () => void;
  hasMore: boolean;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  loadMore,
  hasMore,
}) => {
  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadMore, hasMore]);

  return <div ref={observerTarget} style={{ height: "20px" }} />;
};
