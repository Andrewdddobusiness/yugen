import { create } from "zustand";

import type {
  ItineraryChangeLogWithActorProfile,
  ItineraryInvitationRow,
  ItineraryMember,
  ItineraryMemberRole,
} from "@/types/collaboration";

interface ItineraryCollaborationState {
  itineraryId: string | null;
  itineraryTitle: string | null;
  ownerId: string | null;
  currentUserId: string | null;
  currentUserRole: ItineraryMemberRole | null;

  members: ItineraryMember[];
  invitations: ItineraryInvitationRow[];
  history: ItineraryChangeLogWithActorProfile[];
  activeUserIds: string[];

  setItineraryMeta: (meta: {
    itineraryId: string;
    title: string | null;
    ownerId: string;
    currentUserId: string;
    currentUserRole: ItineraryMemberRole;
  }) => void;
  setMembers: (members: ItineraryMember[]) => void;
  setInvitations: (invitations: ItineraryInvitationRow[]) => void;
  setHistory: (history: ItineraryChangeLogWithActorProfile[]) => void;
  setActiveUserIds: (ids: string[]) => void;
  reset: () => void;

  getMemberById: (userId: string) => ItineraryMember | undefined;
}

export const useItineraryCollaborationStore = create<ItineraryCollaborationState>((set, get) => ({
  itineraryId: null,
  itineraryTitle: null,
  ownerId: null,
  currentUserId: null,
  currentUserRole: null,

  members: [],
  invitations: [],
  history: [],
  activeUserIds: [],

  setItineraryMeta: (meta) =>
    set({
      itineraryId: meta.itineraryId,
      itineraryTitle: meta.title,
      ownerId: meta.ownerId,
      currentUserId: meta.currentUserId,
      currentUserRole: meta.currentUserRole,
    }),

  setMembers: (members) => set({ members }),
  setInvitations: (invitations) => set({ invitations }),
  setHistory: (history) => set({ history }),
  setActiveUserIds: (ids) => set({ activeUserIds: ids }),

  reset: () =>
    set({
      itineraryId: null,
      itineraryTitle: null,
      ownerId: null,
      currentUserId: null,
      currentUserRole: null,
      members: [],
      invitations: [],
      history: [],
      activeUserIds: [],
    }),

  getMemberById: (userId) => get().members.find((m) => m.user_id === userId),
}));

