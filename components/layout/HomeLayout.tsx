import React, { ReactNode } from "react";
import Navigation from "@/components/layout/navigation/Navigation";
import Footer from "@/components/layout/footer/Footer";

interface PageLayoutProps {
  children: ReactNode;
}

export default function HomeLayout({
  children,
}: PageLayoutProps): React.ReactElement {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <div className="flex-grow">{children}</div>
      <Footer />
    </div>
  );
}
