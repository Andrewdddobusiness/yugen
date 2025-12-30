"use server";

import { createClient } from "@/utils/supabase/server";

import type {
  ItineraryChangeLogRow,
  ItineraryCollaboratorRole,
  ItineraryInvitationRow,
  ItineraryMember,
  ItineraryMemberProfile,
  ItineraryMemberRole,
} from "@/types/collaboration";

const parseIntId = (value: string) => {
  const trimmed = String(value ?? "").trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
};

const isMissingTableError = (error: any, tableName: string) => {
  if (!error) return false;
  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();
  const table = tableName.toLowerCase();

  // Postgres: undefined_table
  if (code === "42P01") return true;

  // PostgREST schema cache miss (table not found / not exposed)
  if (code.startsWith("PGRST") && message.includes("schema cache") && message.includes(table)) {
    return true;
  }
  if (code.startsWith("PGRST") && message.includes("could not find") && message.includes(table)) {
    return true;
  }

  // PostgREST sometimes wraps Postgres errors into a generic message.
  if (message.includes("does not exist") && message.includes(table)) return true;
  if (message.includes("relation") && message.includes("does not exist")) return true;

  return false;
};

let warnedMissingCollaboratorTable = false;
let collaboratorTableSupported: boolean | null = null;

export async function listItineraryMembers(itineraryId: string) {
  const itineraryIdInt = parseIntId(itineraryId);
  if (!itineraryIdInt) {
    return { success: false as const, message: "Invalid itinerary id" };
  }

  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false as const, message: "Not authenticated" };
  }

  const { data: itinerary, error: itineraryError } = await supabase
    .from("itinerary")
    .select("itinerary_id,user_id,title")
    .eq("itinerary_id", itineraryIdInt)
    .single();

  if (itineraryError || !itinerary) {
    return { success: false as const, message: "Failed to load itinerary", error: itineraryError };
  }

  let collaborators: Array<{ user_id: string; role: string; removed_at: string | null }> = [];
  if (collaboratorTableSupported !== false) {
    const { data, error } = await supabase
      .from("itinerary_collaborator")
      .select("user_id,role,removed_at")
      .eq("itinerary_id", itineraryIdInt);

    if (error) {
      if (isMissingTableError(error, "itinerary_collaborator")) {
        collaboratorTableSupported = false;
        // Allow the app to still function (owner-only workspace) if the collaboration migration
        // hasn't been applied yet.
        if (!warnedMissingCollaboratorTable) {
          warnedMissingCollaboratorTable = true;
          console.warn(
            "[collaboration] itinerary_collaborator table missing; returning owner-only workspace."
          );
        }
      } else {
        console.error("[collaboration] Failed to load collaborators", error);
        const details = error.message ? `: ${String(error.message)}` : "";
        return {
          success: false as const,
          message: `Failed to load collaborators${details}`,
          error,
        };
      }
    } else {
      if (collaboratorTableSupported == null) collaboratorTableSupported = true;
      collaborators = (data || []) as any;
    }
  }

  const activeCollaborators = (collaborators || []).filter((row) => row.removed_at == null);
  const collaboratorIds = activeCollaborators.map((row) => String(row.user_id));
  const ownerId = String(itinerary.user_id);

  const memberIds = Array.from(new Set([ownerId, ...collaboratorIds]));

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id,display_name,avatar_url")
    .in("user_id", memberIds);

  if (profilesError) {
    return { success: false as const, message: "Failed to load profiles", error: profilesError };
  }

  const profileById = new Map<string, ItineraryMemberProfile>();
  for (const profile of profiles || []) {
    profileById.set(String(profile.user_id), {
      user_id: String(profile.user_id),
      display_name: profile.display_name ?? null,
      avatar_url: profile.avatar_url ?? null,
    });
  }

  const members: ItineraryMember[] = [
    {
      user_id: ownerId,
      role: "owner",
      profile: profileById.get(ownerId) ?? null,
    },
    ...activeCollaborators
      .filter((row) => String(row.user_id) !== ownerId)
      .map((row) => ({
        user_id: String(row.user_id),
        role: row.role as ItineraryCollaboratorRole,
        profile: profileById.get(String(row.user_id)) ?? null,
      })),
  ];

  let currentUserRole: ItineraryMemberRole = "viewer";
  if (user.id === ownerId) {
    currentUserRole = "owner";
  } else {
    const row = activeCollaborators.find((c) => String(c.user_id) === String(user.id));
    if (row?.role === "viewer" || row?.role === "editor") {
      currentUserRole = row.role as ItineraryMemberRole;
    }
  }

  return {
    success: true as const,
    message: "Loaded itinerary members",
    data: {
      itinerary: {
        itinerary_id: String(itinerary.itinerary_id),
        title: itinerary.title ?? null,
        owner_id: ownerId,
      },
      current_user: {
        user_id: String(user.id),
        role: currentUserRole,
      },
      members,
    },
  };
}

export async function listItineraryInvitations(itineraryId: string) {
  const itineraryIdInt = parseIntId(itineraryId);
  if (!itineraryIdInt) {
    return { success: false as const, message: "Invalid itinerary id" };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("itinerary_invitation")
    .select(
      "itinerary_invitation_id,itinerary_id,email,role,status,created_at,expires_at,accepted_at"
    )
    .eq("itinerary_id", itineraryIdInt)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false as const, message: "Failed to load invitations", error };
  }

  return {
    success: true as const,
    message: "Loaded invitations",
    data: (data || []) as unknown as ItineraryInvitationRow[],
  };
}

export async function getOrCreateItineraryInviteLink(itineraryId: string) {
  const itineraryIdInt = parseIntId(itineraryId);
  if (!itineraryIdInt) {
    return { success: false as const, message: "Invalid itinerary id" };
  }

  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false as const, message: "Not authenticated" };
  }

  const { data: itinerary, error: itineraryError } = await supabase
    .from("itinerary")
    .select("itinerary_id,user_id")
    .eq("itinerary_id", itineraryIdInt)
    .single();

  if (itineraryError || !itinerary) {
    return { success: false as const, message: "Failed to load itinerary", error: itineraryError };
  }

  if (String(itinerary.user_id) !== String(user.id)) {
    return { success: false as const, message: "Only the owner can invite" };
  }

  const { data: existing, error: existingError } = await supabase
    .from("itinerary_invite_link")
    .select("itinerary_invite_link_id,role,revoked_at,expires_at,created_at")
    .eq("itinerary_id", itineraryIdInt)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    if (isMissingTableError(existingError, "itinerary_invite_link")) {
      return { success: false as const, message: "Invite links are not enabled yet" };
    }
    return { success: false as const, message: "Failed to load invite link", error: existingError };
  }

  const isExpired =
    existing?.expires_at != null && new Date(existing.expires_at).getTime() < Date.now();

  if (existing && !isExpired) {
    return {
      success: true as const,
      message: "Loaded invite link",
      data: {
        itinerary_invite_link_id: String(existing.itinerary_invite_link_id),
        role: (existing.role as ItineraryCollaboratorRole) ?? "editor",
        expires_at: existing.expires_at ?? null,
      },
    };
  }

  if (existing && isExpired) {
    await supabase
      .from("itinerary_invite_link")
      .update({ revoked_at: new Date().toISOString() })
      .eq("itinerary_invite_link_id", existing.itinerary_invite_link_id);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("itinerary_invite_link")
    .insert({
      itinerary_id: itineraryIdInt,
      role: "editor",
      created_by: user.id,
      expires_at: null,
    })
    .select("itinerary_invite_link_id,role,expires_at")
    .single();

  if (insertError) {
    const maybeDuplicate = String(insertError.code ?? "") === "23505";
    if (maybeDuplicate) {
      const { data: retry, error: retryError } = await supabase
        .from("itinerary_invite_link")
        .select("itinerary_invite_link_id,role,expires_at,created_at")
        .eq("itinerary_id", itineraryIdInt)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!retryError && retry) {
        return {
          success: true as const,
          message: "Loaded invite link",
          data: {
            itinerary_invite_link_id: String(retry.itinerary_invite_link_id),
            role: (retry.role as ItineraryCollaboratorRole) ?? "editor",
            expires_at: retry.expires_at ?? null,
          },
        };
      }
    }

    if (isMissingTableError(insertError, "itinerary_invite_link")) {
      return { success: false as const, message: "Invite links are not enabled yet", error: insertError };
    }

    return { success: false as const, message: "Failed to create invite link", error: insertError };
  }

  return {
    success: true as const,
    message: "Invite link created",
    data: {
      itinerary_invite_link_id: String(inserted.itinerary_invite_link_id),
      role: (inserted.role as ItineraryCollaboratorRole) ?? "editor",
      expires_at: inserted.expires_at ?? null,
    },
  };
}

export async function revokeItineraryInviteLink(inviteLinkId: string) {
  const linkId = String(inviteLinkId ?? "").trim();
  if (!linkId) {
    return { success: false as const, message: "Invalid invite link id" };
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false as const, message: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("itinerary_invite_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("itinerary_invite_link_id", linkId)
    .select("itinerary_invite_link_id")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "itinerary_invite_link")) {
      return { success: false as const, message: "Invite links are not enabled yet", error };
    }
    return { success: false as const, message: "Failed to revoke invite link", error };
  }

  if (!data) {
    return { success: false as const, message: "Invite link not found" };
  }

  return { success: true as const, message: "Invite link revoked" };
}

export async function createItineraryInvitation(params: {
  itineraryId: string;
  email: string;
  role: ItineraryCollaboratorRole;
}) {
  const itineraryIdInt = parseIntId(params.itineraryId);
  const email = String(params.email ?? "").trim();
  const role = params.role;

  if (!itineraryIdInt) {
    return { success: false as const, message: "Invalid itinerary id" };
  }

  if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    return { success: false as const, message: "Invalid email" };
  }

  if (role !== "viewer" && role !== "editor") {
    return { success: false as const, message: "Invalid role" };
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false as const, message: "Not authenticated" };
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("itinerary_invitation")
    .insert({
      itinerary_id: itineraryIdInt,
      email,
      role,
      invited_by: user.id,
      expires_at: expiresAt,
      status: "pending",
    })
    .select(
      "itinerary_invitation_id,itinerary_id,email,role,status,created_at,expires_at,accepted_at"
    )
    .single();

  if (error) {
    return { success: false as const, message: "Failed to create invitation", error };
  }

  return {
    success: true as const,
    message: "Invitation created",
    data: data as unknown as ItineraryInvitationRow,
  };
}

export async function revokeItineraryInvitation(invitationId: string) {
  const inviteId = String(invitationId ?? "").trim();
  if (!inviteId) {
    return { success: false as const, message: "Invalid invitation id" };
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("itinerary_invitation")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    })
    .eq("itinerary_invitation_id", inviteId)
    .select("itinerary_invitation_id")
    .maybeSingle();

  if (error) {
    return { success: false as const, message: "Failed to revoke invitation", error };
  }

  if (!data) {
    return { success: false as const, message: "Invitation not found" };
  }

  return { success: true as const, message: "Invitation revoked" };
}

export async function acceptItineraryInvitation(invitationId: string) {
  const inviteId = String(invitationId ?? "").trim();
  if (!inviteId) {
    return { success: false as const, message: "Invalid invitation id" };
  }

  const supabase = createClient();

  const { data, error } = await supabase.rpc("accept_itinerary_invitation", {
    p_invite_id: inviteId,
  });

  if (error) {
    return { success: false as const, message: error.message || "Failed to accept invitation", error };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.itinerary_id || !row?.itinerary_destination_id) {
    return { success: false as const, message: "Invitation accepted, but itinerary details missing" };
  }

  return {
    success: true as const,
    message: "Invitation accepted",
    data: {
      itinerary_id: String(row.itinerary_id),
      itinerary_destination_id: String(row.itinerary_destination_id),
    },
  };
}

export async function acceptItineraryInviteLink(inviteLinkId: string) {
  const linkId = String(inviteLinkId ?? "").trim();
  if (!linkId) {
    return { success: false as const, message: "Invalid invite link id" };
  }

  const supabase = createClient();

  const { data, error } = await supabase.rpc("accept_itinerary_invite_link", {
    p_link_id: linkId,
  });

  if (error) {
    if (isMissingTableError(error, "itinerary_invite_link")) {
      return { success: false as const, message: "Invite links are not enabled yet", error };
    }
    return { success: false as const, message: error.message || "Failed to accept invite link", error };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.itinerary_id || !row?.itinerary_destination_id) {
    return { success: false as const, message: "Invite accepted, but itinerary details missing" };
  }

  return {
    success: true as const,
    message: "Invite accepted",
    data: {
      itinerary_id: String(row.itinerary_id),
      itinerary_destination_id: String(row.itinerary_destination_id),
    },
  };
}

export async function listItineraryChangeLog(params: { itineraryId: string; limit?: number }) {
  const itineraryIdInt = parseIntId(params.itineraryId);
  if (!itineraryIdInt) {
    return { success: false as const, message: "Invalid itinerary id" };
  }

  const limit = typeof params.limit === "number" && params.limit > 0 ? Math.min(params.limit, 200) : 50;

  const supabase = createClient();

  const { data: logRows, error } = await supabase
    .from("itinerary_change_log")
    .select(
      "itinerary_change_log_id,itinerary_id,itinerary_destination_id,actor_user_id,entity_type,entity_id,action,before,after,created_at"
    )
    .eq("itinerary_id", itineraryIdInt)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { success: false as const, message: "Failed to load history", error };
  }

  const actorIds = Array.from(
    new Set((logRows || []).map((row) => row.actor_user_id).filter(Boolean).map(String))
  );

  const { data: profiles, error: profilesError } = actorIds.length
    ? await supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id", actorIds)
    : { data: [], error: null };

  if (profilesError) {
    return { success: false as const, message: "Failed to load actor profiles", error: profilesError };
  }

  const profileById = new Map<string, ItineraryMemberProfile>();
  for (const profile of profiles || []) {
    profileById.set(String(profile.user_id), {
      user_id: String(profile.user_id),
      display_name: profile.display_name ?? null,
      avatar_url: profile.avatar_url ?? null,
    });
  }

  return {
    success: true as const,
    message: "Loaded history",
    data: (logRows || []).map((row) => ({
      ...(row as unknown as ItineraryChangeLogRow),
      actor_profile: row.actor_user_id ? (profileById.get(String(row.actor_user_id)) ?? null) : null,
    })),
  };
}
