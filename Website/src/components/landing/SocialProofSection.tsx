"use client";

import ScrollStack, { ScrollStackItem } from '@/components/landing/components/ScrollStack';
import { Star, Quote, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';

export default function SocialProofSection() {
  // Reduced from 6 to 3 testimonials as requested
  const testimonials = [
    {
      quote: "Found my perfect PG within 2 days! The verification process made me feel safe, and the owner was so responsive.",
      author: "Priya S.",
      role: "Engineering Student",
      college: "IIT Delhi",
      rating: 5,
      avatar: "P"
    },
    {
      quote: "As a property owner, StudentNest helped me connect with genuine students. The platform is so easy to use!",
      author: "Rajesh M.",
      role: "Property Owner",
      location: "Near DU Campus",
      rating: 5,
      avatar: "R"
    },
    {
      quote: "Transparent pricing, verified owners, and great support. This is how student housing should work!",
      author: "Sneha T.",
      role: "Medical Student",
      college: "AIIMS Delhi",
      rating: 5,
      avatar: "S"
    }
  ];

  const stats = [
    { number: "500+", label: "Students Joined", color: "#7c3aed" },
    { number: "50+", label: "Verified Properties", color: "#3b82f6" },
    { number: "25+", label: "Colleges Covered", color: "#10b981" },
    { number: "4.9", label: "Average Rating", color: "#f59e0b" }
  ];

  return (
    <section className="py-24 bg-[#0a0a0b] relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#10b981]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#7c3aed]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1a1b] border border-[#2a2a2b] mb-6">
            <Star className="w-4 h-4 text-[#f59e0b]" />
            <span className="text-sm text-[#a1a1aa]">Trusted by Students & Owners</span>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-white">What Our </span>
            <span className="bg-gradient-to-r from-[#7c3aed] to-[#10b981] bg-clip-text text-transparent">
              Community Says
            </span>
          </h2>

          <p className="text-xl text-[#a1a1aa] max-w-3xl mx-auto leading-relaxed">
            Real feedback from students and property owners who have successfully
            connected through our platform.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg"
                style={{ backgroundColor: stat.color }}
              >
                <Star className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">{stat.number}</div>
              <div className="text-[#a1a1aa]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials with simple cards (not using ScrollStack for simplicity) */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-[#1a1a1b] to-[#2a2a2b] border border-[#3a3a3b] rounded-2xl p-8 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10"
            >
              {/* Quote icon */}
              <div className="flex justify-between items-start mb-6">
                <Quote className="w-8 h-8 text-[#7c3aed] opacity-60" />
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-[#f59e0b] fill-current" />
                  ))}
                </div>
              </div>

              {/* Testimonial content */}
              <div className="mb-6">
                <p className="text-white text-lg leading-relaxed font-medium">
                  "{testimonial.quote}"
                </p>
              </div>

              {/* Author info */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] flex items-center justify-center text-white font-bold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="text-white font-semibold">{testimonial.author}</div>
                  <div className="text-[#a1a1aa] text-sm">{testimonial.role}</div>
                  {testimonial.college && (
                    <div className="text-[#7c3aed] text-sm">{testimonial.college}</div>
                  )}
                  {testimonial.location && (
                    <div className="text-[#10b981] text-sm flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {testimonial.location}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call-to-action */}
        <div className="text-center">
          <div className="bg-gradient-to-br from-[#1a1a1b] to-[#2a2a2b] border border-[#3a3a3b] rounded-2xl p-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-6 h-6 text-[#10b981]" />
              <span className="text-[#10b981] font-semibold">Early Access Program</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Join Our Growing Community</h3>
            <p className="text-[#a1a1aa] mb-6">
              Be among the first students and property owners to experience the future of student accommodation.
            </p>
            <Link
              href="/student/signup"
              className="inline-block px-8 py-3 bg-gradient-to-r from-[#7c3aed] to-[#10b981] text-white font-semibold rounded-xl hover:from-[#6d28d9] hover:to-[#059669] transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Get Early Access
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
