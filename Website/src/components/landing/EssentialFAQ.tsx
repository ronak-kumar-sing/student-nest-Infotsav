"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

export default function EssentialFAQ() {
  const [openFAQ, setOpenFAQ] = useState(0);

  const faqs = [
    {
      question: "Is StudentNest really free for students?",
      answer: "Yes! Students can browse properties, contact owners, and schedule visits completely free. We also offer an optional Room Partner Search service for ₹99 to help you find compatible roommates."
    },
    {
      question: "How much does it cost for property owners?",
      answer: "Property owners pay just ₹99 for a 4-month listing per room, or ₹199 for an annual plan (saving ₹197). No hidden fees, and you only pay a small commission when bookings are successful."
    },
    {
      question: "How do you verify properties and owners?",
      answer: "We verify every property through document checks and owner authentication. All listings are reviewed before going live to ensure genuine, safe accommodations for students."
    },
    {
      question: "What makes StudentNest different from other platforms?",
      answer: "We're built specifically for students with transparent pricing, direct owner contact, and a focus on verified, student-friendly accommodations. No middlemen, no hidden fees."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? -1 : index);
  };

  return (
    <section className="py-16 bg-[#0a0a0b]">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold mb-4 text-white">Frequently Asked Questions</h2>
          <p className="text-[#a1a1aa] max-w-2xl mx-auto">
            Everything you need to know about StudentNest
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="mb-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="bg-[#1a1a1b] rounded-xl overflow-hidden border border-[#2a2a2b]">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-[#2a2a2b] transition-colors duration-200"
                >
                  <h4 className="text-lg font-semibold text-white pr-4">
                    {faq.question}
                  </h4>
                  <div className={`transform transition-transform duration-200 ${openFAQ === index ? 'rotate-180' : ''}`}>
                    <ChevronDown className="h-5 w-5 text-[#a1a1aa]" />
                  </div>
                </button>

                <AnimatePresence>
                  {openFAQ === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 border-t border-[#2a2a2b] pt-4">
                        <p className="text-[#a1a1aa] leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <p className="text-[#a1a1aa] mb-4">
            Still have questions?
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/contact"
              className="inline-block bg-[#3b82f6] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#2563eb] transition-colors duration-300"
            >
              Contact Support
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
