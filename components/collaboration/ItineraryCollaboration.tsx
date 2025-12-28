"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, History, UserPlus, Users, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import {
  createItineraryInvitation,
  listItineraryChangeLog,
  listItineraryInvitations,
  listItineraryMembers,
  revokeItineraryInvitation,
} from "@/actions/supabase/collaboration";
import { useItineraryCollaborationStore } from "@/store/itineraryCollaborationStore";
import {
  useItineraryCollaborationPanelStore,
  type CollaborationTab,
} from "@/store/itineraryCollaborationPanelStore";
import type { ItineraryCollaboratorRole, ItineraryInvitationRow } from "@/types/collaboration";

const getInitials = (name: string | null | undefined) => {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .join("");
};

const buildInviteUrl = (invitationId: string) => {
  if (typeof window === "undefined") return `/invite/${invitationId}`;
  return `${window.location.origin}/invite/${invitationId}`;
};

export function openItineraryCollaborationPanel(tab?: CollaborationTab) {
  useItineraryCollaborationPanelStore.getState().open(tab);
}

export function ItineraryCollaborationTrigger({ itineraryId }: { itineraryId: string }) {
  const open = useItineraryCollaborationPanelStore((s) => s.open);

  const setItineraryMeta = useItineraryCollaborationStore((s) => s.setItineraryMeta);
  const setMembers = useItineraryCollaborationStore((s) => s.setMembers);
  const setActiveUserIds = useItineraryCollaborationStore((s) => s.setActiveUserIds);

  const members = useItineraryCollaborationStore((s) => s.members);
  const activeUserIds = useItineraryCollaborationStore((s) => s.activeUserIds);
  const currentUserRole = useItineraryCollaborationStore((s) => s.currentUserRole);

  const { data: membersResult } = useQuery({
    queryKey: ["itineraryMembers", itineraryId],
    queryFn: () => listItineraryMembers(itineraryId),
    enabled: !!itineraryId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!membersResult?.success) return;
    const payload = membersResult.data;
    setItineraryMeta({
      itineraryId: payload.itinerary.itinerary_id,
      title: payload.itinerary.title,
      ownerId: payload.itinerary.owner_id,
      currentUserId: payload.current_user.user_id,
      currentUserRole: payload.current_user.role,
    });
    setMembers(payload.members);
  }, [membersResult, setItineraryMeta, setMembers]);

  const isOwner = currentUserRole === "owner";

  // Presence (Supabase Realtime)
  useEffect(() => {
    if (!membersResult?.success) return;
    const currentUserId = membersResult.data.current_user.user_id;
    if (!currentUserId) return;

    const supabase = createSupabaseClient();
    const channel = supabase.channel(`itinerary:${itineraryId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      setActiveUserIds(Object.keys(state));
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.track({
          user_id: currentUserId,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itineraryId, membersResult, setActiveUserIds]);

  const { data: invitationsResult } = useQuery({
    queryKey: ["itineraryInvitations", itineraryId],
    queryFn: () => listItineraryInvitations(itineraryId),
    enabled: isOwner && !!itineraryId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const displayedMembers = useMemo(() => members.slice(0, 4), [members]);
  const overflowCount = Math.max(0, members.length - displayedMembers.length);
  const onlineSet = useMemo(() => new Set(activeUserIds), [activeUserIds]);

  const pendingInvites = useMemo(() => {
    if (!isOwner || !invitationsResult?.success) return [];
    return invitationsResult.data.filter((invite) => invite.status === "pending");
  }, [invitationsResult, isOwner]);

  const displayedInvites = useMemo(() => pendingInvites.slice(0, 2), [pendingInvites]);
  const overflowInviteCount = Math.max(0, pendingInvites.length - displayedInvites.length);

  return (
    <button
      type="button"
      className="flex items-center"
      onClick={() => open("collaborators")}
      aria-label="Open collaboration panel"
    >
      <div className="flex -space-x-2">
        {displayedMembers.length > 0 ? (
          <>
            {displayedMembers.map((member) => {
              const name = member.profile?.display_name ?? null;
              const online = onlineSet.has(member.user_id);
              return (
                <div
                  key={member.user_id}
                  className={[
                    "rounded-full border-2 border-bg-0 bg-bg-0 shadow-sm",
                    online ? "ring-2 ring-lime-400 ring-offset-0" : "",
                  ].join(" ")}
                >
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage src={member.profile?.avatar_url ?? undefined} alt={name ?? "User"} />
                    <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                  </Avatar>
                </div>
              );
            })}
            {overflowCount > 0 && (
              <div className="h-8 w-8 rounded-full border-2 border-bg-0 bg-muted flex items-center justify-center text-xs text-muted-foreground shadow-sm">
                +{overflowCount}
              </div>
            )}
          </>
        ) : (
          <div className="h-8 w-8 rounded-full border-2 border-bg-0 bg-muted flex items-center justify-center text-muted-foreground shadow-sm">
            <Users className="h-4 w-4" />
          </div>
        )}

        {displayedInvites.map((invite) => (
          <div
            key={invite.itinerary_invitation_id}
            className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/40 bg-bg-0 flex items-center justify-center text-xs text-muted-foreground shadow-sm"
            title={`Invite pending: ${invite.email}`}
          >
            {getInitials(invite.email.split("@")[0] ?? null)}
          </div>
        ))}
        {overflowInviteCount > 0 && (
          <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/40 bg-bg-0 flex items-center justify-center text-xs text-muted-foreground shadow-sm">
            +{overflowInviteCount}
          </div>
        )}
      </div>
    </button>
  );
}

export function ItineraryCollaborationPanel({ itineraryId }: { itineraryId: string }) {
  const { toast } = useToast();

  const isOpen = useItineraryCollaborationPanelStore((s) => s.isOpen);
  const tab = useItineraryCollaborationPanelStore((s) => s.tab);
  const setTab = useItineraryCollaborationPanelStore((s) => s.setTab);
  const close = useItineraryCollaborationPanelStore((s) => s.close);

  const resetStore = useItineraryCollaborationStore((s) => s.reset);
  const setItineraryMeta = useItineraryCollaborationStore((s) => s.setItineraryMeta);
  const setMembers = useItineraryCollaborationStore((s) => s.setMembers);
  const members = useItineraryCollaborationStore((s) => s.members);
  const activeUserIds = useItineraryCollaborationStore((s) => s.activeUserIds);
  const ownerId = useItineraryCollaborationStore((s) => s.ownerId);
  const currentUserId = useItineraryCollaborationStore((s) => s.currentUserId);
  const currentUserRole = useItineraryCollaborationStore((s) => s.currentUserRole);

  const setInvitations = useItineraryCollaborationStore((s) => s.setInvitations);
  const setHistory = useItineraryCollaborationStore((s) => s.setHistory);

  const lastItineraryIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    if (!itineraryId) return;
    if (lastItineraryIdRef.current === itineraryId) return;
    resetStore();
    lastItineraryIdRef.current = itineraryId;
  }, [isOpen, itineraryId, resetStore]);

  const { data: membersResult, isFetching: membersFetching } = useQuery({
    queryKey: ["itineraryMembersPanel", itineraryId],
    queryFn: () => listItineraryMembers(itineraryId),
    enabled: isOpen && !!itineraryId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!membersResult?.success) return;
    const payload = membersResult.data;
    setItineraryMeta({
      itineraryId: payload.itinerary.itinerary_id,
      title: payload.itinerary.title,
      ownerId: payload.itinerary.owner_id,
      currentUserId: payload.current_user.user_id,
      currentUserRole: payload.current_user.role,
    });
    setMembers(payload.members);
  }, [membersResult, setItineraryMeta, setMembers]);

  const isOwner = currentUserRole === "owner";
  const isRoleKnown = currentUserRole != null;
  const membersLoaded = membersResult?.success === true;
  const onlineSet = useMemo(() => new Set(activeUserIds), [activeUserIds]);

  const ownerMember = useMemo(
    () => members.find((member) => member.role === "owner"),
    [members]
  );
  const ownerName =
    ownerMember?.profile?.display_name?.trim() ||
    (ownerMember?.user_id ? `Owner (${ownerMember.user_id.slice(0, 8)}…)` : "Owner");

  const sortedMembers = useMemo(() => {
    const copy = [...members];
    copy.sort((a, b) => {
      if (a.role === "owner") return -1;
      if (b.role === "owner") return 1;
      const aOnline = onlineSet.has(a.user_id);
      const bOnline = onlineSet.has(b.user_id);
      if (aOnline !== bOnline) return aOnline ? -1 : 1;
      const aName = a.profile?.display_name ?? "";
      const bName = b.profile?.display_name ?? "";
      return aName.localeCompare(bName);
    });
    return copy;
  }, [members, onlineSet]);

  const { data: invitationsResult, refetch: refetchInvitations, isFetching: invitationsFetching } = useQuery({
    queryKey: ["itineraryInvitations", itineraryId],
    queryFn: () => listItineraryInvitations(itineraryId),
    enabled: isOwner && isOpen && tab === "collaborators" && !!itineraryId,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!invitationsResult?.success) return;
    setInvitations(invitationsResult.data);
  }, [invitationsResult, setInvitations]);

  const { data: historyResult, refetch: refetchHistory, isFetching: historyFetching } = useQuery({
    queryKey: ["itineraryHistory", itineraryId],
    queryFn: () => listItineraryChangeLog({ itineraryId, limit: 200 }),
    enabled: isOpen && tab === "history" && !!itineraryId,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchInterval: isOpen && tab === "history" ? 5_000 : false,
  });

  useEffect(() => {
    if (!historyResult?.success) return;
    setHistory(historyResult.data);
  }, [historyResult, setHistory]);

  // Realtime-ish updates for history (inserts only)
  useEffect(() => {
    if (!isOpen) return;
    if (tab !== "history") return;
    if (!itineraryId) return;

    const supabase = createSupabaseClient();
    const channel = supabase
      .channel(`itinerary-history:${itineraryId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "itinerary_change_log",
          filter: `itinerary_id=eq.${itineraryId}`,
        },
        () => {
          refetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, itineraryId, refetchHistory, tab]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ItineraryCollaboratorRole>("editor");
  const [inviteCreating, setInviteCreating] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const inviteEmailInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen || tab !== "collaborators") return;
    if (!showInviteForm) return;
    const timer = setTimeout(() => inviteEmailInputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [isOpen, showInviteForm, tab]);

  const onCreateInvite = async () => {
    setInviteCreating(true);
    try {
      const result = await createItineraryInvitation({
        itineraryId,
        email: inviteEmail,
        role: inviteRole,
      });
      const normalizedEmail = inviteEmail.trim().toLowerCase();

      if (!result.success) {
        const maybeDuplicate =
          (result as any)?.error?.code === "23505" ||
          String((result as any)?.error?.message ?? "")
            .toLowerCase()
            .includes("duplicate") ||
          String((result as any)?.error?.message ?? "")
            .toLowerCase()
            .includes("unique");

        if (maybeDuplicate) {
          const existing = await listItineraryInvitations(itineraryId);
          if (existing.success) {
            const pending = existing.data.find(
              (invite) =>
                invite.status === "pending" &&
                String(invite.email ?? "").trim().toLowerCase() === normalizedEmail
            );
            if (pending) {
              const inviteUrl = buildInviteUrl(pending.itinerary_invitation_id);
              await navigator.clipboard.writeText(inviteUrl);
              toast({
                title: "Invite already exists",
                description: "Existing link copied to clipboard.",
              });
              setInviteEmail("");
              await refetchInvitations();
              return;
            }
          }
        }

        throw result.error ?? new Error(result.message);
      }

      const inviteUrl = buildInviteUrl(result.data.itinerary_invitation_id);
      await navigator.clipboard.writeText(inviteUrl);

      toast({
        title: "Invite created",
        description: "Link copied to clipboard.",
      });
      setInviteEmail("");
      await refetchInvitations();
    } catch (error) {
      console.error(error);
      toast({
        title: "Invite failed",
        description: error instanceof Error ? error.message : "Could not create invitation.",
        variant: "destructive",
      });
    } finally {
      setInviteCreating(false);
    }
  };

  const onCopyInvite = async (invite: ItineraryInvitationRow) => {
    try {
      const inviteUrl = buildInviteUrl(invite.itinerary_invitation_id);
      await navigator.clipboard.writeText(inviteUrl);
      toast({ title: "Copied", description: "Invite link copied to clipboard." });
    } catch (error) {
      console.error(error);
      toast({ title: "Copy failed", description: "Could not copy invite link.", variant: "destructive" });
    }
  };

  const onRevokeInvite = async (invite: ItineraryInvitationRow) => {
    try {
      const result = await revokeItineraryInvitation(invite.itinerary_invitation_id);
      if (!result.success) throw result.error ?? new Error(result.message);
      toast({ title: "Invite revoked" });
      await refetchInvitations();
    } catch (error) {
      console.error(error);
      toast({ title: "Revoke failed", description: "Could not revoke invitation.", variant: "destructive" });
    }
  };

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen shrink-0 border-l border-stroke-200 bg-bg-0 overflow-hidden transition-[width] duration-200 ease-out",
        isOpen ? "w-[var(--sidebar-width-mobile)] sm:w-[var(--sidebar-width)]" : "w-0"
      )}
      aria-hidden={!isOpen}
    >
      <div className={cn("h-full flex flex-col", !isOpen && "opacity-0 pointer-events-none")}>
        <div className="p-4 border-b border-stroke-200 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5" />
            Collaboration
          </div>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Close collaboration panel">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as CollaborationTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="px-4 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="collaborators" className="flex-1">
                <Users className="h-4 w-4 mr-2" />
                Workspace
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="collaborators" className="mt-0 flex min-h-0 flex-1 flex-col">
            <ScrollArea className="flex-1 px-4 pb-6">
              <div className="mt-4 space-y-4">
	                  <div>
	                    <div className="flex items-center justify-between gap-2 mb-2">
	                      <div className="flex items-center gap-2 min-w-0">
	                        <div className="text-sm font-medium text-ink-900 truncate">
	                          Workspace
	                        </div>
	                        <Badge variant="secondary" className="shrink-0">
	                          {members.length}
	                        </Badge>
	                      </div>
	                      <Button
	                        type="button"
	                        size="sm"
	                        variant="outline"
	                        className="gap-2"
                          disabled={!isRoleKnown || !isOwner}
                          title={
                            !isRoleKnown
                              ? "Loading…"
                              : !isOwner
                              ? `Only the owner can invite. Owner: ${ownerName}`
                              : "Create an invite link"
                          }
	                        onClick={() => {
	                          setShowInviteForm(true);
	                        }}
	                      >
	                        <UserPlus className="h-4 w-4" />
	                        Add people
	                      </Button>
	                    </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {membersFetching ? (
                          "Loading workspace members…"
                        ) : membersResult?.success === false ? (
                          <span className="text-red-600">
                            Could not load workspace: {membersResult.message}
                          </span>
                        ) : currentUserRole ? (
                          <>
                            You are <span className="text-ink-900 font-medium">{currentUserRole}</span>
                            {" "}
                            · Owner: <span className="text-ink-900 font-medium">{ownerName}</span>
                            {process.env.NODE_ENV !== "production" && ownerId && currentUserId ? (
                              <div className="mt-1 text-[10px] leading-4">
                                ownerId: <span className="font-mono">{ownerId}</span> · you:{" "}
                                <span className="font-mono">{currentUserId}</span>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          "You may not have access to view collaborators."
                        )}
                      </div>
	                    <div className="space-y-2">
                        {membersLoaded && !membersFetching && members.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            No members found for this itinerary.
                          </div>
                        ) : null}
	                      {sortedMembers.map((member) => {
	                        const name = member.profile?.display_name ?? "Unknown";
	                        const online = onlineSet.has(member.user_id);
                          const isYou = currentUserId && member.user_id === currentUserId;
	                        return (
	                          <div
	                            key={member.user_id}
	                            className="flex items-center justify-between rounded-lg border border-stroke-200 bg-bg-0 px-3 py-2"
	                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={online ? "ring-2 ring-lime-400 rounded-full" : ""}>
                                <Avatar className="h-9 w-9 rounded-full">
                                  <AvatarImage src={member.profile?.avatar_url ?? undefined} alt={name} />
                                  <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                                </Avatar>
                              </div>
	                              <div className="min-w-0">
	                                <div className="text-sm font-medium text-ink-900 truncate">
                                      {name}
                                      {isYou ? <span className="text-muted-foreground font-normal"> (you)</span> : null}
                                    </div>
	                                <div className="text-xs text-muted-foreground">{online ? "Active now" : "Offline"}</div>
	                              </div>
	                            </div>
	                            <Badge variant={member.role === "owner" ? "default" : "secondary"}>{member.role}</Badge>
	                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {isOwner && showInviteForm && (
                    <div className="rounded-xl border border-stroke-200 bg-bg-0 p-3">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="text-sm font-medium text-ink-900">Invite collaborator</div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowInviteForm(false);
                            setInviteEmail("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label htmlFor="invite-email">Email</Label>
                          <Input
                            id="invite-email"
                            ref={inviteEmailInputRef}
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="person@example.com"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label>Role</Label>
                          <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as ItineraryCollaboratorRole)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button type="button" className="w-full" disabled={inviteCreating || !inviteEmail} onClick={onCreateInvite}>
                          Create invite link
                        </Button>
                        <div className="text-xs text-muted-foreground">
                          Creates a link valid for 7 days and copies it to your clipboard.
                        </div>
                      </div>
                    </div>
                  )}

                  {isOwner && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-ink-900">Invitations</div>
                        <Button variant="ghost" size="sm" onClick={() => refetchInvitations()} disabled={invitationsFetching}>
                          Refresh
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {(invitationsResult?.success ? invitationsResult.data : []).map((invite) => (
                          <div
                            key={invite.itinerary_invitation_id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-stroke-200 bg-bg-0 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{invite.email}</div>
                              <div className="text-xs text-muted-foreground">
                                {invite.role} · {invite.status}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => onCopyInvite(invite)} aria-label="Copy invite link">
                                <Copy className="h-4 w-4" />
                              </Button>
                              {invite.status === "pending" && (
                                <Button variant="ghost" size="icon" onClick={() => onRevokeInvite(invite)} aria-label="Revoke invite">
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}

                        {invitationsResult?.success && invitationsResult.data.length === 0 && (
                          <div className="text-sm text-muted-foreground">No invites yet.</div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="mt-0 flex min-h-0 flex-1 flex-col">
            <ScrollArea className="flex-1 px-4 pb-6">
              <div className="mt-4 space-y-2">
                  {historyResult?.success &&
                    historyResult.data.map((row) => {
                      const actorName = row.actor_profile?.display_name ?? "Unknown";
                      const timestamp = new Date(row.created_at).toLocaleString();
                      return (
                        <div
                          key={row.itinerary_change_log_id}
                          className="rounded-lg border border-stroke-200 bg-bg-0 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium truncate">
                              {actorName} · {row.action}
                            </div>
                            <div className="text-xs text-muted-foreground shrink-0">{timestamp}</div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {row.entity_type} #{row.entity_id}
                          </div>
                        </div>
                      );
                    })}

                  {historyResult?.success && historyResult.data.length === 0 && (
                    <div className="text-sm text-muted-foreground">No changes yet.</div>
                  )}

                  {!historyResult?.success && historyFetching && (
                    <div className="text-sm text-muted-foreground">Loading…</div>
                  )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  );
}
