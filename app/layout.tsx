import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "./layoutWrapper";

export const metadata: Metadata = {
  title: "Journey",
  description: "Creating your next travel plan, way easier.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <LayoutWrapper>{children}</LayoutWrapper>;
}
