import React, { ReactNode } from "react";
import Navigation from "@/components/shared/Navigation";
import Footer from "@/components/shared/Footer";

interface PageLayoutProps {
  children: ReactNode;
}

export default function HomeLayout({ children }: PageLayoutProps): React.ReactElement {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <div className="flex-grow mt-16">{children}</div>
      <Footer />
    </div>
  );
}
