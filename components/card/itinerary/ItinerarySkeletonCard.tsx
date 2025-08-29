import { Skeleton } from "../ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ItinerarySkeletonCard() {
  return (
    <Card className="h-60 w-full sm:w-60 relative rounded-xl shadow-lg">
      <Skeleton className="w-full h-40 rounded-t-xl rounded-b-none" />
      <CardHeader>
        <CardTitle>
          <Skeleton className="w-[100px] h-[15px] rounded-lg" />
        </CardTitle>
        <div>
          <Skeleton className="w-[150px] h-[10px] rounded-lg" />
        </div>
      </CardHeader>
    </Card>
  );
}
