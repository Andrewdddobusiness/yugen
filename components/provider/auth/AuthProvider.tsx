"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { useUserStore } from "@/store/userStore";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearSupabaseAuthStorage() {
  // Supabase stores auth sessions under keys like:
  // - sb-<project-ref>-auth-token
  // - sb-<project-ref>-auth-token-code-verifier
  // Some browser sessions can end up with double-encoded JSON which breaks recovery.
  try {
    const keys = Object.keys(window.localStorage || {});
    for (const key of keys) {
      if (!key.startsWith("sb-")) continue;
      if (!key.includes("auth-token")) continue;
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }

  // Best-effort removal for non-HttpOnly cookies (if any).
  try {
    const cookies = document.cookie.split(";").map((c) => c.trim()).filter(Boolean);
    for (const cookie of cookies) {
      const [name] = cookie.split("=");
      if (!name?.startsWith("sb-")) continue;
      if (!name.includes("auth-token")) continue;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  } catch {
    // ignore
  }
}

function looksLikeCorruptedSupabaseSession(error: unknown) {
  return (
    error instanceof TypeError &&
    typeof error.message === "string" &&
    error.message.includes("Cannot create property 'user' on string")
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const userStore = useUserStore.getState();
    userStore.setUserLoading(true);

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        userStore.setUser(session?.user ?? null);
        userStore.setUserLoading(false);
      } catch (error) {
        // If auth storage got corrupted, Supabase can throw while attempting session recovery.
        // Clear auth storage and allow the user to sign in again.
        if (looksLikeCorruptedSupabaseSession(error)) {
          clearSupabaseAuthStorage();
        }
        setSession(null);
        setUser(null);
        setLoading(false);
        userStore.setUser(null);
        userStore.setUserLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);

          userStore.setUser(session?.user ?? null);
          userStore.setUserLoading(false);

          // Handle sign in event
          if (event === "SIGNED_IN" && session?.user) {
            await createOrUpdateProfile(session.user);
          }
        } catch {
          // Keep auth events from breaking the app if storage or network is flaky.
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const createOrUpdateProfile = async (user: User) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: user.user_metadata?.full_name || 
                       `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
                       null,
          avatar_url: user.user_metadata?.avatar_url || null,
        }, {
          onConflict: 'user_id'
        });

      if (error && error.code !== '23505') { // Ignore unique constraint violations
        console.error("Error creating/updating profile");
      }
    } catch (error) {
      console.error("Error in createOrUpdateProfile");
    }
  };

  const signOut = async () => {
    setLoading(true);
    useUserStore.getState().setUserLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
    const userStore = useUserStore.getState();
    userStore.setUser(null);
    userStore.setUserLoading(false);
  };

  const refreshUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    useUserStore.getState().setUser(user);
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useUser() {
  const { user } = useAuth();
  return user;
}

export function useSession() {
  const { session } = useAuth();
  return session;
}
