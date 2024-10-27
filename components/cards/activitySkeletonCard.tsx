import { Skeleton } from "../ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from "@/components/ui/card";

export default function ActivitySkeletonCard() {
  return (
    <Card className="flex flex-col w-full h-[365px]">
      <Skeleton className="w-full h-40 rounded-t-lg rounded-b-none mb-6" />

      <CardContent className="flex flex-col gap-2 flex-grow">
        <Skeleton className="w-3/4 h-[15px] rounded-lg" />
        <Skeleton className="w-1/2 h-[15px] rounded-lg" />
        <Skeleton className="w-1/4 h-[15px] rounded-full" />

        <Skeleton className="w-full h-[10px] rounded-lg mt-2" />
        <Skeleton className="w-full h-[10px] rounded-lg" />
      </CardContent>
      <CardFooter className="p-0">
        <Skeleton className="w-full h-10 rounded-b-lg rounded-t-none" />
      </CardFooter>
    </Card>
  );
}
