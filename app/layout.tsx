import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "./layoutWrapper";

export const metadata: Metadata = {
  title: "Journey - Plan Your Perfect Trip Like a Pro",
  description: "The ultimate travel itinerary builder that brings together destination discovery, wishlist building, and drag-and-drop scheduling in one beautiful app. Start planning your next adventure for free.",
  keywords: ["travel planner", "itinerary builder", "trip planning", "travel organizer", "vacation planner", "journey", "wanderlog alternative"],
  authors: [{ name: "Journey Team" }],
  creator: "Journey",
  publisher: "Journey",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://journey.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Journey - Plan Your Perfect Trip Like a Pro",
    description: "The ultimate travel itinerary builder that brings together destination discovery, wishlist building, and drag-and-drop scheduling in one beautiful app.",
    url: "https://journey.app",
    siteName: "Journey",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Journey - Travel Itinerary Planner",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Journey - Plan Your Perfect Trip Like a Pro",
    description: "The ultimate travel itinerary builder that brings together destination discovery, wishlist building, and drag-and-drop scheduling in one beautiful app.",
    images: ["/og-image.png"],
    creator: "@journeyapp",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <LayoutWrapper>{children}</LayoutWrapper>;
}
