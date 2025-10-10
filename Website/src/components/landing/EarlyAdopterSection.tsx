"use client";

import { motion } from "framer-motion";
import { Users, Shield, Headphones } from "lucide-react";
import Link from "next/link";

export default function EarlyAdopterSection() {
  return (
    <section className="py-12 bg-gradient-to-r from-[#3b82f6] to-[#7c3aed] text-white">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h3 className="text-2xl font-bold mb-4">Join Our Early Community</h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Be among the first to experience hassle-free student housing.
            Early users get priority support and special benefits.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-8 text-blue-100 mb-6">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              <span>Growing Community</span>
            </div>
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              <span>Verified Platform</span>
            </div>
            <div className="flex items-center">
              <Headphones className="h-5 w-5 mr-2" />
              <span>Dedicated Support</span>
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/student/signup"
              className="inline-block bg-white text-[#3b82f6] px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors duration-300"
            >
              Get Early Access
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
