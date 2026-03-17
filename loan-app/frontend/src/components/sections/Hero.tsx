"use client";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const Hero = () => {
  const trustBadges = ["Car Loans", "Auto-Rickshaw Loans", "Quick Approvals"];

  return (
    <section id="home" className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-navy">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white opacity-10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_rgba(38,70,122,0.4)_0%,_transparent_70%)] opacity-30"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-white/80 uppercase tracking-[0.3em] mb-6 border border-white/10">
              Trusted in Bengaluru
            </span>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight uppercase mb-8">
              Fast & Reliable <span className="text-white/60">Vehicle Loans</span> in Bengaluru.
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 font-medium leading-relaxed max-w-2xl mb-10">
              Square Finance specializes in Car and Auto-Rickshaw commercial vehicle loans — quick approvals, minimal paperwork, and complete transparency.
            </p>

            <div className="flex flex-wrap gap-4 mb-16">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 bg-white text-navy px-8 py-4 rounded-xl text-xs font-black uppercase tracking-[0.15em] shadow-2xl transition-all hover:scale-105 active:scale-95 group"
              >
                Enquire Now
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#services"
                className="inline-flex items-center bg-navy border border-white/20 text-white px-8 py-4 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all hover:bg-white/5"
              >
                Our Services
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-10 border-t border-white/10">
              {trustBadges.map((badge, idx) => (
                <motion.div
                  key={badge}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"
                >
                  <CheckCircle2 className="w-4 h-4 text-accent-red" />
                  {badge}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Hero Visual Element (Abstract Shape) */}
      <div className="absolute right-0 bottom-0 top-0 w-1/3 hidden lg:block pointer-events-none">
        <motion.div
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 1.2, ease: "easeOut" }}
           className="w-[150%] h-full bg-accent-red/5 rounded-full blur-[120px] absolute -right-1/4"
        />
      </div>
    </section>
  );
};

export default Hero;
