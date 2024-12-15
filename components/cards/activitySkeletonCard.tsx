import { Skeleton } from "../ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from "@/components/ui/card";

export default function ActivitySkeletonCard() {
  return (
    <Card className="flex flex-col w-full h-[365px] rounded-xl">
      <Skeleton className="w-full h-full rounded-t-lg rounded-b-none" />
    </Card>
  );
}
