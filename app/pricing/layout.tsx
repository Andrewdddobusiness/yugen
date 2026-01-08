import React, { ReactNode } from "react";
import MarketingNavigation from "@/components/layout/navigation/MarketingNavigation";
import Footer from "@/components/layout/footer/Footer";

interface PageLayoutProps {
  children: ReactNode;
}

export default function HomeLayout({ children }: PageLayoutProps): React.ReactElement {
  return (
    <div className="flex flex-col min-h-screen">
      <MarketingNavigation />
      <div className="flex-grow mt-16">{children}</div>
      <Footer />
    </div>
  );
}
