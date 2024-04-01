import React, { ReactNode } from "react";
import Navigation from "@/components/navigation/navigation";
import Footer from "@/components/footer/footer";

interface PageLayoutProps {
  children: ReactNode;
}

export default function PageLayout({
  children,
}: PageLayoutProps): React.ReactElement {
  return (
    <div className="flex justify-center items-center px-8">
      <div className="max-w-screen-2xl">{children}</div>
    </div>
  );
}
