export type ItineraryCollaboratorRole = "viewer" | "editor";

export type ItineraryMemberRole = "owner" | ItineraryCollaboratorRole;

export interface ItineraryMemberProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ItineraryMember {
  user_id: string;
  role: ItineraryMemberRole;
  profile: ItineraryMemberProfile | null;
}

export interface ItineraryInvitationRow {
  itinerary_invitation_id: string;
  itinerary_id: number;
  email: string;
  role: ItineraryCollaboratorRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
}

export interface ItineraryChangeLogRow {
  itinerary_change_log_id: string;
  itinerary_id: number;
  itinerary_destination_id: number | null;
  actor_user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  before: unknown | null;
  after: unknown | null;
  created_at: string;
}

export interface ItineraryChangeLogWithActorProfile extends ItineraryChangeLogRow {
  actor_profile: ItineraryMemberProfile | null;
}

