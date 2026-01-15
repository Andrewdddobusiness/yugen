import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "./layoutWrapper";

export const metadata: Metadata = {
  title: "Planaway - Travel Planner",
  description:
    "Planaway is your calm, glassy travel copilot with wolf-level focus. Discover, organize, and schedule trips with tactile buttons, smart maps, and premium clarity.",
  keywords: [
    "Planaway",
    "travel planner",
    "itinerary builder",
    "trip planning",
    "travel organizer",
    "vacation planner",
    "wanderlog alternative",
  ],
  authors: [{ name: "Planaway Team" }],
  creator: "Planaway",
  publisher: "Planaway",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://planaway.website"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Planaway - Travel Planner",
    description:
      "Planaway blends calm guidance, glassmorphic polish, and tactile controls to make travel planning feel premium and precise.",
    url: "https://planaway.website",
    siteName: "Planaway",
    images: [
      {
        url: "/planaway-og.svg",
        width: 1200,
        height: 630,
        alt: "Planaway - Travel Itinerary Planner",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Planaway - Travel Planner",
    description:
      "A glassy, modern travel planner with wolf-inspired focus, tactile buttons, and map-first clarity.",
    images: ["/planaway-og.svg"],
    creator: "@planaway",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutWrapper>{children}</LayoutWrapper>;
}
