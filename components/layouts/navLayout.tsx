import React, { ReactNode } from "react";
import Navigation from "@/components/navigation/navigation";
import Footer from "@/components/footer/footer";

interface PageLayoutProps {
  children: ReactNode;
}

export default function NavLayout({
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
