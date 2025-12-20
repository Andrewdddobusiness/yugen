"use client";
import { Londrina_Solid, Londrina_Sketch, Nunito } from "next/font/google";
import Providers from "./providers";
import { Toaster } from "@/components/ui/toaster";

const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
});

const londrinaSolid = Londrina_Solid({
  weight: ["400", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-londrina-solid",
});

const londrinaSketch = Londrina_Sketch({
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-londrina-sketch",
});

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${londrinaSolid.variable} ${londrinaSketch.variable}`}>
      <body className={nunito.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
