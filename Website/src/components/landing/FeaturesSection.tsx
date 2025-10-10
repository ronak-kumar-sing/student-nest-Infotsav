"use client";

import Folder from '@/components/landing/components/Folder';
import { Shield, Users, Search, Star, Clock, CheckCircle } from 'lucide-react';

export default function FeaturesSection() {
  const features = [
    {
      icon: Shield,
      title: "Verified Security",
      description: "Multi-factor authentication with OTP verification and mandatory Aadhaar verification for property owners.",
      color: "#7c3aed",
      items: [
        { title: "Email & Phone OTP", icon: "✓" },
        { title: "Aadhaar Verification", icon: "🔒" },
        { title: "Identity Validation", icon: "✅" }
      ]
    },
    {
      icon: Users,
      title: "Student Community",
      description: "Platform designed specifically for college students with integrated college verification system.",
      color: "#3b82f6",
      items: [
        { title: "College ID Integration", icon: "🎓" },
        { title: "Student Verification", icon: "👥" },
        { title: "Peer Reviews", icon: "⭐" }
      ]
    },
    {
      icon: Search,
      title: "Smart Discovery",
      description: "Advanced search filters and AI-powered recommendations to find your perfect accommodation.",
      color: "#10b981",
      items: [
        { title: "Location-based Search", icon: "📍" },
        { title: "Budget Filters", icon: "💰" },
        { title: "Amenity Matching", icon: "🏠" }
      ]
    }
  ];

  return (
    <section className="py-24 bg-[#0a0a0b] relative overflow-hidden" id="features">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7c3aed]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#3b82f6]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1a1b] border border-[#2a2a2b] mb-6">
            <Star className="w-4 h-4 text-[#10b981]" />
            <span className="text-sm text-[#a1a1aa]">Why Choose StudentNest</span>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-white">Built for </span>
            <span className="bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] bg-clip-text text-transparent">
              Students
            </span>
          </h2>

          <p className="text-xl text-[#a1a1aa] max-w-3xl mx-auto leading-relaxed">
            Every feature is designed with student safety, convenience, and budget in mind.
            From verification to discovery, we've got you covered.
          </p>
        </div>

        {/* Features grid with Folder components */}
        <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
          {features.map((feature, index) => (
            <div key={index} className="group relative">
              {/* Feature card */}
              <div className="bg-gradient-to-br from-[#1a1a1b] to-[#2a2a2b] border border-[#3a3a3b] rounded-2xl p-8 h-full transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10">

                {/* Icon and title */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                </div>

                {/* Description */}
                <p className="text-[#a1a1aa] mb-8 leading-relaxed">
                  {feature.description}
                </p>

                {/* Interactive Folder component */}
                <div className="flex justify-center mb-6">
                  <Folder
                    color={feature.color}
                    size={1.2}
                    items={feature.items}
                    className="transition-transform duration-300 group-hover:scale-110"
                  />
                </div>

                {/* Feature list */}
                <div className="space-y-3">
                  {feature.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#2a2a2b] flex items-center justify-center text-sm">
                        {item.icon}
                      </div>
                      <span className="text-[#a1a1aa] text-sm">{item.title}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom accent */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { number: "500+", label: "Students Joined", icon: Users },
            { number: "50+", label: "Verified Properties", icon: Shield },
            { number: "24/7", label: "Support Available", icon: Clock },
            { number: "100%", label: "Verification Rate", icon: CheckCircle }
          ].map((stat, index) => (
            <div key={index} className="text-center group">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.number}</div>
              <div className="text-[#a1a1aa] text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
