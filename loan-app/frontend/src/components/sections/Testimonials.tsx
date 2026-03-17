"use client";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const Testimonials = () => {
  const reviews = [
    {
      quote: "Got my auto-rickshaw loan approved quickly with very little paperwork. Square Finance made it so easy!",
      author: "Manjunath R.",
      role: "Auto Driver, Bengaluru",
    },
    {
      quote: "Transparent process, no hidden charges. My car loan was processed faster than I expected.",
      author: "Suresh K.",
      role: "Car Owner, BSK Stage",
    },
  ];

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-black text-navy uppercase tracking-tight"
          >
            Trusted by Bengaluru's Drivers
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {reviews.map((review, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="bg-white p-10 rounded-3xl border-l-[6px] border-accent-red shadow-xl shadow-slate-200/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-accent-red text-accent-red" />
                  ))}
                </div>
                <p className="text-xl font-medium text-slate-700 leading-relaxed italic mb-8">
                  "{review.quote}"
                </p>
              </div>
              <div>
                <div className="font-black text-navy uppercase tracking-widest text-sm">{review.author}</div>
                <div className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">{review.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
