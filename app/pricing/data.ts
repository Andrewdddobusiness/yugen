interface PricingDetails {
  price: string;
  saving?: string;
  interval: string;
  priceId: string;
  originalPrice?: string;
}

export const pricingDetails: Record<string, PricingDetails> = {
  monthly: {
    price: "15",
    interval: "Month",
    priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRO_PLAN_ID!,
  },
  yearly: {
    price: "144",
    originalPrice: "180",
    saving: "20%",
    interval: "Year",
    priceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRO_PLAN_ID!,
  },
};

export const freeFeatures = [
  "Create unlimited itineraries",
  "Live collaboration with friends",
  "Smart recommendations",
  "Itinerary and map in 1 view",
  "Organize your activities",
  "Itinerary calendar view",
];

export const proFeatures = [
  "Offline access",
  "Export to Google Maps",
  "Optimize route",
  "AI assistance - Coming soon",
  "Add places from anywhere on the web",
];
