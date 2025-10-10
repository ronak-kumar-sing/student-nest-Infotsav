"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Heart } from "lucide-react";
import Link from "next/link";
import { StudentNestLogoIcon } from "@/components/ui/logo";

export default function SimpleFooter() {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { name: "Pricing", href: "/pricing" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Contact", href: "/contact" },
    { name: "Support", href: "/support" }
  ];

  return (
    <footer className="bg-[#0a0a0b] py-16 border-t border-[#2a2a2b]" id="contact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Company Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-6">
              <StudentNestLogoIcon className="w-12 h-12" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] bg-clip-text text-transparent">
                  StudentNest
                </h1>
                <p className="text-sm text-[#a1a1aa] -mt-1">
                  Find Your Perfect Student Home
                </p>
              </div>
            </div>

            <p className="text-[#a1a1aa] mb-6 leading-relaxed max-w-md">
              India's newest student housing platform, connecting students
              with verified properties. Making student accommodation search simple, safe, and affordable.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[#a1a1aa]">
                <Mail className="h-5 w-5 text-[#7c3aed]" />
                <span>hello@studentnest.in</span>
              </div>
              <div className="flex items-center gap-3 text-[#a1a1aa]">
                <Phone className="h-5 w-5 text-[#3b82f6]" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-3 text-[#a1a1aa]">
                <MapPin className="h-5 w-5 text-[#10b981]" />
                <span>Delhi NCR, India</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-lg font-semibold text-white mb-6">Quick Links</h3>
            <div className="grid grid-cols-2 gap-4">
              {footerLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-[#a1a1aa] hover:text-white transition-colors duration-300 hover:translate-x-1 transform inline-block"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Early Access Info */}
            <div className="mt-8 p-6 bg-gradient-to-br from-[#1a1a1b] to-[#2a2a2b] border border-[#3a3a3b] rounded-xl">
              <h4 className="text-white font-semibold mb-2">Early Access Program</h4>
              <p className="text-[#a1a1aa] text-sm mb-4">
                Be among the first to experience the future of student accommodation.
              </p>
              <Link
                href="/student/signup"
                className="inline-flex px-4 py-2 bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white text-sm font-semibold rounded-lg hover:from-[#6d28d9] hover:to-[#2563eb] transition-all duration-300"
              >
                Join Now
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="pt-8 border-t border-[#2a2a2b]"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-[#a1a1aa]">
              <span>© {currentYear} StudentNest. Made with</span>
              <Heart className="h-4 w-4 text-[#ef4444] fill-current animate-pulse" />
              <span>for students in India</span>
            </div>

            <div className="text-[#a1a1aa] text-sm">
              Launching Soon • Early Access Available
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
