import { create } from "zustand";

interface UserState {
  user: any | null;
  isUserLoading: boolean;
  profileUrl: string | null;
  isProfileUrlLoading: boolean;
  setUser: (user: any | null) => void;
  setUserLoading: (loading: boolean) => void;
  setProfileUrl: (url: string) => void;
  setIsProfileUrlLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isUserLoading: true,
  profileUrl: null,
  isProfileUrlLoading: false,
  setUser: (user: any | null) => set({ user }),
  setUserLoading: (loading: boolean) => set({ isUserLoading: loading }),
  setProfileUrl: (url: string) => set({ profileUrl: url }),
  setIsProfileUrlLoading: (loading: boolean) => set({ isProfileUrlLoading: loading }),
}));
