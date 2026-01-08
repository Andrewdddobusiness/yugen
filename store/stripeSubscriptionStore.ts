import { create } from "zustand";

export interface ISubscriptionDetails {
  status: "active" | "inactive";
  currentPeriodEnd: Date;
  subscriptionId: string;
  stripeCustomerId: string;
  currency: string;
  attrs: any;
}

interface ISubscriptionStore {
  subscription: ISubscriptionDetails | null;
  isSubscriptionLoading: boolean;
  setSubscription: (subscription: ISubscriptionDetails | null) => void;
  setIsSubscriptionLoading: (isLoading: boolean) => void;
}

export const useStripeSubscriptionStore = create<ISubscriptionStore>((set) => ({
  subscription: null,
  isSubscriptionLoading: false,
  setSubscription: (subscription) => set({ subscription }),
  setIsSubscriptionLoading: (isLoading) => set({ isSubscriptionLoading: isLoading }),
}));
