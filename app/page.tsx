"use client";

import { Suspense, lazy } from "react";

import HomeLayout from "@/components/layout/HomeLayout";
import HeroSection from "@/components/landing/HeroSection";
import { useUserStore } from "@/store/userStore";

const FeatureShowcase = lazy(() => import("@/components/landing/FeatureShowcase"));

export default function Home() {
  const { user, isUserLoading } = useUserStore();

  return (
    <HomeLayout>
      <HeroSection user={user} isUserLoading={isUserLoading} />
      <Suspense fallback={<div className="py-24 bg-bg-50" />}>
        <FeatureShowcase />
      </Suspense>
    </HomeLayout>
  );
}
