import { create } from "zustand";
import { createClient } from "@/utils/supabase/client";

interface UserState {
  user: any | null;
  isLoading: boolean;
  profileUrl: string | null;
  fetchUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: true,
  profileUrl: null,
  fetchUser: async () => {
    const supabase = createClient();
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) throw error;

      const { data } = await supabase.storage.from("avatars").getPublicUrl(user.id + "/profile");

      set({
        user,
        profileUrl: data?.publicUrl || null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      set({ user: null, isLoading: false });
    }
  },
}));
