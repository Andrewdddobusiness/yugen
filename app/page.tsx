"use client";

import HomeLayout from "@/components/layout/HomeLayout";
import HeroSection from "@/components/landing/HeroSection";
import FeatureShowcase from "@/components/landing/FeatureShowcase";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingPreview from "@/components/landing/PricingPreview";
import CTASection from "@/components/landing/CTASection";
import { useUserStore } from "@/store/userStore";

export default function Home() {
  const { user, isUserLoading } = useUserStore();

  return (
    <HomeLayout>
      <HeroSection user={user} isUserLoading={isUserLoading} />
      <FeatureShowcase />
      <TestimonialsSection />
      <PricingPreview />
      <CTASection />
    </HomeLayout>
  );
}
