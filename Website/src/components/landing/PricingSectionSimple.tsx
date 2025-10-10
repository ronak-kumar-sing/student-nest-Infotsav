"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function PricingSection() {
  return (
    <section className="py-16 bg-[#0a0a0b]" id="pricing">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold mb-4 text-white">Simple, Student-Friendly Pricing</h2>
          <p className="text-[#a1a1aa] max-w-2xl mx-auto">
            Built for students with transparent, affordable pricing
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Students - Free */}
          <motion.div
            className="bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/10 border-2 border-[#10b981] rounded-2xl p-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="text-center">
              <h3 className="text-2xl font-bold text-[#10b981] mb-2">For Students</h3>
              <div className="text-4xl font-bold text-[#10b981] mb-4">FREE</div>
              <p className="text-[#a1a1aa] mb-6">Always free to find your perfect home</p>

              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center text-white">
                  <CheckCircle className="h-5 w-5 text-[#10b981] mr-2 flex-shrink-0" />
                  <span>Browse all properties</span>
                </li>
                <li className="flex items-center text-white">
                  <CheckCircle className="h-5 w-5 text-[#10b981] mr-2 flex-shrink-0" />
                  <span>Contact property owners</span>
                </li>
                <li className="flex items-center text-white">
                  <CheckCircle className="h-5 w-5 text-[#10b981] mr-2 flex-shrink-0" />
                  <span>Schedule visits</span>
                </li>
                <li className="flex items-center text-white">
                  <CheckCircle className="h-5 w-5 text-[#10b981] mr-2 flex-shrink-0" />
                  <span>Verified listings</span>
                </li>
              </ul>

              <div className="border-t border-[#10b981]/30 pt-4">
                <p className="text-sm text-[#a1a1aa] mb-2">Optional Add-on:</p>
                <p className="font-semibold text-[#3b82f6]">Room Partner Search: ₹99</p>
                <p className="text-xs text-[#a1a1aa]">Find 6 compatible roommates</p>
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/student/signup"
                  className="block w-full mt-6 bg-[#10b981] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#059669] transition-colors duration-300"
                >
                  Get Started Free
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* Property Owners */}
          <motion.div
            className="bg-gradient-to-br from-[#3b82f6]/20 to-[#3b82f6]/10 border-2 border-[#3b82f6] rounded-2xl p-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="text-center">
              <h3 className="text-2xl font-bold text-[#3b82f6] mb-2">For Property Owners</h3>
              <div className="text-4xl font-bold text-[#3b82f6] mb-1">₹99</div>
              <p className="text-sm text-[#a1a1aa] mb-4">4-month listing per room</p>

              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center text-white">
                  <CheckCircle className="h-5 w-5 text-[#3b82f6] mr-2 flex-shrink-0" />
                  <span>List your property</span>
                </li>
                <li className="flex items-center text-white">
                  <CheckCircle className="h-5 w-5 text-[#3b82f6] mr-2 flex-shrink-0" />
                  <span>Reach verified students</span>
                </li>
                <li className="flex items-center text-white">
                  <CheckCircle className="h-5 w-5 text-[#3b82f6] mr-2 flex-shrink-0" />
                  <span>Direct messaging</span>
                </li>
                <li className="flex items-center text-white">
                  <CheckCircle className="h-5 w-5 text-[#3b82f6] mr-2 flex-shrink-0" />
                  <span>No hidden fees</span>
                </li>
              </ul>

              <div className="border-t border-[#3b82f6]/30 pt-4 mb-6">
                <p className="text-sm font-semibold text-[#3b82f6]">Annual Plan: ₹199</p>
                <p className="text-xs text-[#a1a1aa]">Save ₹197 with yearly plan</p>
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/owner/signup"
                  className="block w-full bg-[#3b82f6] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#2563eb] transition-colors duration-300"
                >
                  Start Listing
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <p className="text-[#a1a1aa]">
            <strong>Success-based model:</strong> Small commission only when bookings are successful
          </p>
        </motion.div>
      </div>
    </section>
  );
}
