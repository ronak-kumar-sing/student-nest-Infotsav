"use client";

import TiltedCard from '@/components/landing/components/TiltedCard';
import { CheckCircle, ArrowRight, Search, MessageSquare, Star } from "lucide-react";
import Link from "next/link";

export default function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      icon: Search,
      title: "Search & Discover",
      description: "Browse verified properties near your college with smart filters for budget, amenities, and distance.",
      image: "/screenshots/room-search.svg",
      altText: "Property search interface",
      color: "#7c3aed"
    },
    {
      step: "02",
      icon: MessageSquare,
      title: "Connect & Visit",
      description: "Chat with verified owners, schedule visits, and get all your questions answered instantly.",
      image: "/screenshots/dashboard-view.svg",
      altText: "Student dashboard view",
      color: "#3b82f6"
    },
    {
      step: "03",
      icon: CheckCircle,
      title: "Secure & Move",
      description: "Book with confidence through our secure platform and move into your perfect student home.",
      image: "/screenshots/property-details.svg",
      altText: "Property details page",
      color: "#10b981"
    }
  ];

  return (
    <section className="py-24 bg-[#0a0a0b] relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-[#7c3aed]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-[#10b981]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1a1b] border border-[#2a2a2b] mb-6">
            <Star className="w-4 h-4 text-[#10b981]" />
            <span className="text-sm text-[#a1a1aa]">Simple Process</span>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-white">How It </span>
            <span className="bg-gradient-to-r from-[#7c3aed] to-[#10b981] bg-clip-text text-transparent">
              Works
            </span>
          </h2>

          <p className="text-xl text-[#a1a1aa] max-w-3xl mx-auto leading-relaxed">
            From search to move-in, we've streamlined the entire process to make finding
            student accommodation simple, safe, and stress-free.
          </p>
        </div>

        {/* Steps with TiltedCard components */}
        <div className="grid lg:grid-cols-3 gap-16">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {/* Step number badge */}
              <div className="absolute -top-6 left-8 z-20">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">{step.step}</span>
                </div>
              </div>

              {/* Main card with TiltedCard */}
              <div className="bg-gradient-to-br from-[#1a1a1b] to-[#2a2a2b] border border-[#3a3a3b] rounded-2xl p-8 h-full transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10">

                {/* TiltedCard component */}
                <div className="mb-8 h-48">
                  <TiltedCard
                    imageSrc={step.image}
                    altText={step.altText}
                    containerHeight="192px"
                    containerWidth="100%"
                    imageHeight="180px"
                    imageWidth="280px"
                    scaleOnHover={1.1}
                    rotateAmplitude={12}
                    showMobileWarning={false}
                    showTooltip={false}
                  />
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: step.color }}
                    >
                      <step.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{step.title}</h3>
                  </div>

                  <p className="text-[#a1a1aa] leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow connector (except for last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-8 transform -translate-y-1/2">
                    <ArrowRight className="w-6 h-6 text-[#3a3a3b] group-hover:text-[#7c3aed] transition-colors duration-300" />
                  </div>
                )}

                {/* Bottom accent */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ backgroundColor: step.color }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Call-to-action */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-br from-[#1a1a1b] to-[#2a2a2b] border border-[#3a3a3b] rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h3>
            <p className="text-[#a1a1aa] mb-6">
              Join hundreds of students who have already found their perfect accommodation through StudentNest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/student/signup"
                className="px-8 py-3 bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white font-semibold rounded-xl hover:from-[#6d28d9] hover:to-[#2563eb] transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Find Accommodation
              </Link>
              <Link
                href="/owner/signup"
                className="px-8 py-3 border border-[#3a3a3b] bg-[#1a1a1b] text-white font-semibold rounded-xl hover:bg-[#2a2a2b] transition-all duration-300"
              >
                List Your Property
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
