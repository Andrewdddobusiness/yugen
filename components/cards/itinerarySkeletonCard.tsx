import Image from "next/image";

import { Skeleton } from "../ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function ItinerarySkeletonCard() {
  return (
    <Card className="aspect-w-1 aspect-h-1 relative">
      <Skeleton className="w-[247px] h-40 rounded-t-lg" />
      <CardHeader>
        <CardTitle>
          <Skeleton className="w-[100px] h-[15px] rounded-lg" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="w-[150px] h-[10px] rounded-lg" />
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
