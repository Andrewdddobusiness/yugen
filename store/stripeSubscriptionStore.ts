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
  setSubscription: (subscription) =>
    set(() => {
      if (!subscription) return { subscription: null };

      const currentPeriodEndRaw = (subscription as any)?.currentPeriodEnd;
      const currentPeriodEnd =
        currentPeriodEndRaw instanceof Date ? currentPeriodEndRaw : new Date(String(currentPeriodEndRaw));

      return {
        subscription: {
          ...subscription,
          currentPeriodEnd,
        },
      };
    }),
  setIsSubscriptionLoading: (isLoading) => set({ isSubscriptionLoading: isLoading }),
}));
