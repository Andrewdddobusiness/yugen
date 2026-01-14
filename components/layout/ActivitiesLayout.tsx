import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export default async function ActivitiesLayout({
  children,
  searchParams,
}: {
  children: React.ReactNode;
  searchParams: { i: string; d: string };
}) {
  const supabase = createClient();

  const { i: itineraryId, d: destinationId } = searchParams;
  if (!itineraryId || !destinationId) {
    redirect("/itineraries");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  const { data: itinerary } = await supabase
    .from("itinerary")
    .select("user_id")
    .eq("itinerary_id", itineraryId)
    .single();

  if (!itinerary || itinerary.user_id !== user.id) {
    redirect("/itineraries");
  }

  const { data: destination } = await supabase
    .from("itinerary_destination")
    .select("itinerary_id")
    .eq("itinerary_destination_id", destinationId)
    .eq("itinerary_id", itineraryId)
    .single();

  if (!destination) {
    redirect("/itineraries");
  }

  return <>{children}</>;
}
