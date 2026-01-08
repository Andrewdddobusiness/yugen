"use client";

import { Suspense, lazy, useEffect, useRef, useState } from "react";

import HomeLayout from "@/components/layout/HomeLayout";
import HeroSection from "@/components/landing/HeroSection";
import { useUserStore } from "@/store/userStore";

const FeatureShowcase = lazy(() => import("@/components/landing/FeatureShowcase"));

export default function Home() {
  const { user, isUserLoading } = useUserStore();
  const [showFeatures, setShowFeatures] = useState(false);
  const featuresTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (showFeatures) return;

    const target = featuresTriggerRef.current;
    if (!target) return;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setShowFeatures(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShowFeatures(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px", threshold: 0.01 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [showFeatures]);

  return (
    <HomeLayout>
      <HeroSection user={user} isUserLoading={isUserLoading} />
      <div ref={featuresTriggerRef} className="h-px w-full" />
      {showFeatures ? (
        <Suspense fallback={<div className="py-24 bg-bg-50" />}>
          <FeatureShowcase />
        </Suspense>
      ) : (
        <div className="py-24 bg-bg-50" />
      )}
    </HomeLayout>
  );
}
