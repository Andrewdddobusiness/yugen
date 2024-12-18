"use client";
import { GeistSans } from "geist/font/sans";
import { Outfit } from "next/font/google";
import Providers from "./providers";
import { Toaster } from "@/components/ui/toaster";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
});

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${GeistSans.className} ${outfit.className}`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
