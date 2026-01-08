import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "./layoutWrapper";

export const metadata: Metadata = {
  title: "Yugi - Travel Planner",
  description:
    "Yugi is your calm, glassy travel copilot with wolf-level focus. Discover, organize, and schedule trips with tactile buttons, smart maps, and premium clarity.",
  keywords: [
    "Yugi",
    "travel planner",
    "itinerary builder",
    "trip planning",
    "travel organizer",
    "vacation planner",
    "wanderlog alternative",
  ],
  authors: [{ name: "Yugi Team" }],
  creator: "Yugi",
  publisher: "Yugi",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://yugi.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Yugi - Travel Planner",
    description:
      "Yugi blends calm guidance, glassmorphic polish, and tactile controls to make travel planning feel premium and precise.",
    url: "https://yugi.app",
    siteName: "Yugi",
    images: [
      {
        url: "/yugi-og.svg",
        width: 1200,
        height: 630,
        alt: "Yugi - Travel Itinerary Planner",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yugi - Travel Planner",
    description:
      "A glassy, modern travel planner with wolf-inspired focus, tactile buttons, and map-first clarity.",
    images: ["/yugi-og.svg"],
    creator: "@yugiapp",
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
