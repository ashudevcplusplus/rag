import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { ProductDemo } from '../components/ProductDemo';
import { ScrollIndicator } from '../components/ScrollIndicator';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { useScrollTo } from '../lib/useScrollTo';

const stats = [
  { value: '99.9%', label: 'Accuracy' },
  { value: '10x', label: 'Faster' },
  { value: '500K+', label: 'Documents' },
  { value: '24/7', label: 'Available' },
];

export function Hero() {
  const { scrollTo } = useScrollTo();

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-20 sm:pb-32">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center">
          {/* Minimal Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
            </span>
            <span className="text-sm text-slate-400">
              Now with GPT-4 Integration
            </span>
          </motion.div>

          {/* Main Heading - Clean and Bold */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1]"
          >
            <span className="text-white">Transform Your Data</span>
            <br />
            <span className="gradient-text">Into Intelligence</span>
          </motion.h1>

          {/* Subtitle - Refined */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-xl mx-auto text-lg sm:text-xl text-slate-400 mb-10 leading-relaxed"
          >
            Advanced AI that understands, analyzes, and extracts insights 
            from your documents in seconds.
          </motion.p>

          {/* CTA Buttons - Minimal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <button 
              onClick={() => scrollTo('pricing')} 
              className="btn-primary group w-full sm:w-auto"
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </button>
            <button 
              onClick={() => scrollTo('how-it-works')} 
              className="btn-secondary group w-full sm:w-auto"
            >
              <Play className="w-4 h-4 mr-2 opacity-70" />
              Watch Demo
            </button>
          </motion.div>

          {/* Stats - Clean Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12 max-w-2xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                className="text-center group"
              >
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1 group-hover:text-primary-400 transition-colors duration-300">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Product Demo */}
        <ProductDemo />

        {/* Scroll Indicator */}
        <ScrollIndicator />
      </div>
    </section>
  );
}
