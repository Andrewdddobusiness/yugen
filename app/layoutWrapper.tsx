"use client";
import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { GeistSans } from "geist/font/sans";
import { Outfit } from "next/font/google";
import Providers from "./providers";
import { Toaster } from "@/components/ui/toaster";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
});

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useUserStore.getState().fetchUser();
  }, []);

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
