import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";
import { acceptItineraryInvitation, acceptItineraryInviteLink } from "@/actions/supabase/collaboration";

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

  const { data: inviteLink } = await supabase
    .from("itinerary_invite_link")
    .select("itinerary_invite_link_id,role,revoked_at,expires_at")
    .eq("itinerary_invite_link_id", token)
    .maybeSingle();

  const inviteKind: "invitation" | "link" | null = invite
    ? "invitation"
    : inviteLink
      ? "link"
      : null;

  const invitation = inviteKind === "invitation" ? invite : null;
  const link = inviteKind === "link" ? inviteLink : null;

  const linkExpired = link?.expires_at != null && new Date(link.expires_at).getTime() < Date.now();
  const linkRevoked = link?.revoked_at != null;

  const canAccept =
    invitation != null ? invitation.status === "pending" : link != null ? !linkExpired && !linkRevoked : false;

  if (inviteKind === "link" && canAccept && !searchParams?.error) {
    const result = await acceptItineraryInviteLink(token);
    if (!result.success) {
      const message = result.message || "Failed to accept invite link";
      redirect(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);
    }

    redirect(
      `/itinerary/${result.data.itinerary_id}/${result.data.itinerary_destination_id}/builder?view=calendar`
    );
  }

  async function acceptAction() {
    "use server";

    if (inviteKind === "invitation") {
      const result = await acceptItineraryInvitation(token);
      if (!result.success) {
        const message = result.message || "Failed to accept invitation";
        redirect(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);
      }

      redirect(
        `/itinerary/${result.data.itinerary_id}/${result.data.itinerary_destination_id}/builder?view=calendar`
      );
    }

    if (inviteKind === "link") {
      const result = await acceptItineraryInviteLink(token);
      if (!result.success) {
        const message = result.message || "Failed to accept invite link";
        redirect(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);
      }

      redirect(
        `/itinerary/${result.data.itinerary_id}/${result.data.itinerary_destination_id}/builder?view=calendar`
      );
    }

    redirect(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent("Invite link is invalid")}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="text-lg font-semibold">Accept invitation</div>

        {searchParams?.error ? (
          <div className="text-sm text-red-600">{searchParams.error}</div>
        ) : null}

        {inviteKind === "invitation" ? (
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>
              Invited email: <span className="text-ink-900">{invitation?.email ?? ""}</span>
            </div>
            <div>
              Role: <span className="text-ink-900">{invitation?.role ?? ""}</span>
            </div>
            <div>
              Status: <span className="text-ink-900">{invitation?.status ?? ""}</span>
            </div>
          </div>
        ) : inviteKind === "link" ? (
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>
              This is a shareable invite link that grants{" "}
              <span className="text-ink-900">{link?.role ?? "editor"}</span> access.
            </div>
            {linkRevoked ? <div className="text-red-600">This link has been revoked.</div> : null}
            {linkExpired ? <div className="text-red-600">This link has expired.</div> : null}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            This invite may be invalid, expired, or not available.
          </div>
        )}

        <form action={acceptAction} className="space-y-2">
          <Button className="w-full" disabled={!canAccept}>
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
