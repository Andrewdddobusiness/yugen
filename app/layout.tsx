import type { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "yugen",
  description: "Creating your next travel plan, easier.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.className} `}>{children}</body>
      <Toaster />
    </html>
  );
}
