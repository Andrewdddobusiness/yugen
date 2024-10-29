import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ActivitiesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { itineraryId: string; destinationId: string };
}) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, "", options);
        },
      },
    }
  );

  const { itineraryId, destinationId } = params;

  if (!itineraryId || !destinationId) {
    redirect("/dashboard");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: itinerary } = await supabase
    .from("itinerary")
    .select("user_id")
    .eq("itinerary_id", itineraryId)
    .single();

  if (!itinerary || itinerary.user_id !== user.id) {
    redirect("/dashboard");
  }

  const { data: destination } = await supabase
    .from("itinerary_destination")
    .select("itinerary_id")
    .eq("itinerary_destination_id", destinationId)
    .eq("itinerary_id", itineraryId)
    .single();

  if (!destination) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
