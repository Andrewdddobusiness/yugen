"use client";

import { createContext, useContext, useEffect, useState } from "react";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const userStore = useUserStore.getState();
    userStore.setUserLoading(true);

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      userStore.setUser(session?.user ?? null);
      userStore.setUserLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        userStore.setUser(session?.user ?? null);
        userStore.setUserLoading(false);

        // Handle sign in event
        if (event === 'SIGNED_IN' && session?.user) {
          // Optionally trigger profile creation/update
          await createOrUpdateProfile(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

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
        console.error('Error creating/updating profile:', error);
      }
    } catch (error) {
      console.error('Error in createOrUpdateProfile:', error);
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
