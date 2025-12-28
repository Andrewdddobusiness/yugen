import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";
import { acceptItineraryInvitation } from "@/actions/supabase/collaboration";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { error?: string };
}) {
  const token = String(params.token ?? "").trim();

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6 space-y-3">
          <div className="text-lg font-semibold">Invalid invite link</div>
          <div className="text-sm text-muted-foreground">This invitation link is missing a token.</div>
          <Link href="/itineraries">
            <Button className="w-full">Go to itineraries</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const next = `/invite/${encodeURIComponent(token)}`;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6 space-y-4">
          <div className="text-lg font-semibold">Accept invitation</div>
          <div className="text-sm text-muted-foreground">
            Please sign in to accept this itinerary collaboration invite.
          </div>
          <div className="flex gap-2">
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="flex-1">
              <Button className="w-full">Login</Button>
            </Link>
            <Link href={`/signUp?next=${encodeURIComponent(next)}`} className="flex-1">
              <Button variant="outline" className="w-full">
                Sign up
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { data: invite } = await supabase
    .from("itinerary_invitation")
    .select("itinerary_invitation_id,email,role,status,expires_at")
    .eq("itinerary_invitation_id", token)
    .maybeSingle();

  async function acceptAction() {
    "use server";
    const result = await acceptItineraryInvitation(token);
    if (!result.success) {
      const message = result.message || "Failed to accept invitation";
      redirect(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);
    }

    redirect(
      `/itinerary/${result.data.itinerary_id}/${result.data.itinerary_destination_id}/builder?view=calendar`
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="text-lg font-semibold">Accept invitation</div>

        {searchParams?.error ? (
          <div className="text-sm text-red-600">{searchParams.error}</div>
        ) : null}

        {invite ? (
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>
              Invited email: <span className="text-ink-900">{invite.email}</span>
            </div>
            <div>
              Role: <span className="text-ink-900">{invite.role}</span>
            </div>
            <div>
              Status: <span className="text-ink-900">{invite.status}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            This invitation may be invalid, expired, or not intended for your account.
          </div>
        )}

        <form action={acceptAction} className="space-y-2">
          <Button className="w-full" disabled={!invite || invite.status !== "pending"}>
            Accept invite
          </Button>
          <Link href="/itineraries" className="block">
            <Button type="button" variant="outline" className="w-full">
              Not now
            </Button>
          </Link>
        </form>
      </Card>
    </div>
  );
}

