import { create } from "zustand";

export interface ISubscriptionDetails {
  status: "active" | "inactive";
  currentPeriodEnd: Date;
  subscriptionId: string;
  stripeCustomerId: string;
  currency: string;
  attrs: any;
}

const parseDateish = (value: unknown) => {
  if (value instanceof Date) return value;
  const str = String(value ?? "");
  const candidates: string[] = [str];

  // Handle common Postgres timestamp formats like:
  // - "2026-01-14 00:00:00+00"
  // - "2026-01-14 00:00:00+0000"
  // - "2026-01-14T00:00:00+00"
  const withT = str.includes(" ") ? str.replace(" ", "T") : str;
  candidates.push(withT);
  candidates.push(
    withT
      // "+0000" => "+00:00"
      .replace(/([+-]\\d{2})(\\d{2})$/, "$1:$2")
      // "+00" => "+00:00"
      .replace(/([+-]\\d{2})$/, "$1:00")
  );

  for (const candidate of candidates) {
    const date = new Date(candidate);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return new Date(NaN);
};

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
      const currentPeriodEnd = parseDateish(currentPeriodEndRaw);

      return {
        subscription: {
          ...subscription,
          currentPeriodEnd,
        },
      };
    }),
  setIsSubscriptionLoading: (isLoading) => set({ isSubscriptionLoading: isLoading }),
}));
