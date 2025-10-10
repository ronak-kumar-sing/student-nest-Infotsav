"use client";

import dynamic from 'next/dynamic';

// Dynamically import modern landing page components
const Header = dynamic(() => import('@/components/landing/Header'), {
  loading: () => <div className="h-20 bg-[#0a0a0b]"></div>
});

const ModernHeroSection = dynamic(() => import('@/components/landing/ModernHeroSection'), {
  loading: () => <div className="h-screen bg-[#0a0a0b]"></div>
});

const FeaturesSection = dynamic(() => import('@/components/landing/FeaturesSection'), {
  loading: () => <div className="h-96 bg-[#0a0a0b]"></div>
});

const HowItWorksSection = dynamic(() => import('@/components/landing/HowItWorksSection'), {
  loading: () => <div className="h-96 bg-[#0a0a0b]"></div>
});

const SocialProofSection = dynamic(() => import('@/components/landing/SocialProofSection'), {
  loading: () => <div className="h-96 bg-[#0a0a0b]"></div>
});

const PricingSectionSimple = dynamic(() => import('@/components/landing/PricingSectionSimple'), {
  loading: () => <div className="h-96 bg-[#0a0a0b]"></div>
});

const EarlyAdopterSection = dynamic(() => import('@/components/landing/EarlyAdopterSection'), {
  loading: () => <div className="h-48 bg-[#0a0a0b]"></div>
});

const EssentialFAQ = dynamic(() => import('@/components/landing/EssentialFAQ'), {
  loading: () => <div className="h-96 bg-[#0a0a0b]"></div>
});

const SimpleFooter = dynamic(() => import('@/components/landing/SimpleFooter'), {
  loading: () => <div className="h-64 bg-[#0a0a0b]"></div>
});

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Modern dark-themed header */}
      <Header />

      {/* Main landing page content with custom components */}
      <main className="relative">
        {/* Hero section with CardSwap component */}
        <ModernHeroSection />

        {/* Features section with Folder component */}
        <FeaturesSection />

        {/* How it works with TiltedCard component */}
        <HowItWorksSection />

        {/* Social proof with reduced testimonials (3 instead of 6) */}
        <SocialProofSection />

        {/* Modern pricing section */}
        <PricingSectionSimple />

        {/* Early adopter section for new launch */}
        <EarlyAdopterSection />

        {/* Essential FAQ */}
        <EssentialFAQ />
      </main>

      {/* Modern footer */}
      <SimpleFooter />
    </div>
  );
}
