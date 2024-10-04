import type { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "@/components/ui/toaster";

import Providers from "./providers";

export const metadata: Metadata = {
  title: "Planaway",
  description: "Creating your next travel plan, way easier.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.className} `}>
        <Providers>
          {children} <Toaster />
        </Providers>
      </body>
    </html>
  );
}
