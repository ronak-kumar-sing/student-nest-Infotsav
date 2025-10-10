"use client";

import CardSwap, { Card } from '@/components/landing/components/CardSwap';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star, Users, Shield } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

// MacOS Navigation Bar Component
function MacOSNavBar() {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      setCurrentTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-8 bg-[#1e1e1e] flex items-center justify-between px-3 text-xs text-white/80 border-b border-white/10">
      {/* Left side - Traffic lights */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]"></div>
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
        <div className="w-3 h-3 rounded-full bg-[#28ca42]"></div>
      </div>

      {/* Center - Window title */}
      <div className="text-white/70 font-medium">
        StudentNest
      </div>

      {/* Right side - Time */}
      <div className="text-white/80 font-mono">
        {currentTime}
      </div>
    </div>
  );
}

export default function ModernHeroSection() {
  return (
    <section className="relative min-h-screen bg-[#0a0a0b] overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed]/20 via-transparent to-[#3b82f6]/20"></div>

      {/* Content container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 overflow-visible">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-6rem)]">

          {/* Left side - Text content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1a1b] border border-[#2a2a2b]">
              <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
              <span className="text-sm text-[#a1a1aa]">New Launch - Join Early Adopters</span>
            </div>

            {/* Main headline */}
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] bg-clip-text text-transparent">
                  Find Your
                </span>
                <br />
                <span className="text-white">Perfect</span>
                <br />
                <span className="bg-gradient-to-r from-[#3b82f6] to-[#10b981] bg-clip-text text-transparent">
                  Student Home
                </span>
              </h1>

              <p className="text-xl text-[#a1a1aa] max-w-lg leading-relaxed">
                Connect with verified property owners near your college.
                Secure, transparent, and student-focused accommodation platform.
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] hover:from-[#6d28d9] hover:to-[#2563eb] text-white border-0 h-14 px-8 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link href="/student/signup">
                  Find Accommodation
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-[#2a2a2b] bg-[#1a1a1b] hover:bg-[#2a2a2b] text-white h-14 px-8 text-lg rounded-xl transition-all duration-300"
              >
                <Link href="/pricing">
                  View Pricing
                </Link>
              </Button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-8 pt-4">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] border-2 border-[#0a0a0b]"></div>
                  ))}
                </div>
                <span className="text-[#a1a1aa] text-sm">500+ Students Joined</span>
              </div>

              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-[#10b981] fill-current" />
                <span className="text-[#a1a1aa] text-sm">Early Access Program</span>
              </div>
            </div>
          </div>

          {/* Right side - CardSwap component */}
          <div className="relative flex justify-end items-end h-full">
            <div className="relative lg:translate-x-43 lg:-translate-y-10">
              <CardSwap
                width={760}
                height={650}
                cardDistance={100}
                verticalDistance={120}
                delay={4000}
                pauseOnHover={false}
                skewAmount={7}
                easing="elastic"
              >
                <Card customClass="bg-[#2a2a2a] border-[#3a3a3a] shadow-2xl overflow-hidden rounded-xl">
                  <div className="w-full h-full flex flex-col">
                    <MacOSNavBar />
                    <div className="flex-1 relative">
                      <Image
                        src="/screenshots/dashboard-view.svg"
                        alt="Student Dashboard"
                        width={700}
                        height={568}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <Users className="w-6 h-6 text-[#7c3aed]" />
                          <h3 className="text-lg font-bold text-white">Student Dashboard</h3>
                        </div>
                        <p className="text-[#a1a1aa] text-sm">Browse verified properties and manage your applications</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card customClass="bg-[#2a2a2a] border-[#3a3a3a] shadow-2xl overflow-hidden rounded-xl">
                  <div className="w-full h-full flex flex-col">
                    <MacOSNavBar />
                    <div className="flex-1 relative">
                      <Image
                        src="/screenshots/room-search.svg"
                        alt="Room Search"
                        width={700}
                        height={568}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <Shield className="w-6 h-6 text-[#10b981]" />
                          <h3 className="text-lg font-bold text-white">Smart Search</h3>
                        </div>
                        <p className="text-[#a1a1aa] text-sm">Find properties with advanced filters and location-based search</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card customClass="bg-[#2a2a2a] border-[#3a3a3a] shadow-2xl overflow-hidden rounded-xl">
                  <div className="w-full h-full flex flex-col">
                    <MacOSNavBar />
                    <div className="flex-1 relative">
                      <Image
                        src="/screenshots/property-details.svg"
                        alt="Property Details"
                        width={700}
                        height={568}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <Star className="w-6 h-6 text-[#3b82f6]" />
                          <h3 className="text-lg font-bold text-white">Property Details</h3>
                        </div>
                        <p className="text-[#a1a1aa] text-sm">Detailed information, photos, and verified owner contact</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </CardSwap>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0b] to-transparent"></div>
    </section>
  );
}
