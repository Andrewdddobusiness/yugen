import { create } from "zustand";

interface CartStore {
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

export const useCartStore = create<CartStore>((set) => ({
  isCartOpen: false,
  setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
}));
