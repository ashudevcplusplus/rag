import { motion } from 'framer-motion';
import { ArrowRight, Play, Zap, Shield, Cpu } from 'lucide-react';
import { ProductDemo } from '../components/ProductDemo';
import { useScrollTo } from '../lib/useScrollTo';

const stats = [
  { value: '99.9%', label: 'Accuracy Rate' },
  { value: '10x', label: 'Faster Processing' },
  { value: '500K+', label: 'Documents Analyzed' },
  { value: '24/7', label: 'AI Support' },
];

const floatingIcons = [
  { Icon: Zap, delay: 0, x: -100, y: -50 },
  { Icon: Shield, delay: 0.5, x: 100, y: -80 },
  { Icon: Cpu, delay: 1, x: 120, y: 60 },
];

export function Hero() {
  const { scrollTo } = useScrollTo();

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 xs:pt-24 pb-16 sm:pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 xs:px-6 sm:px-8 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 xs:px-4 py-2 rounded-full glass mb-6 sm:mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
            </span>
            <span className="text-xs xs:text-sm font-medium text-slate-300">
              <span className="hidden xs:inline">Introducing </span>NexusAI v2.0 — <span className="hidden sm:inline">Now with </span>GPT-4
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-6 leading-tight"
          >
            <span className="block text-white">Transform Your Data Into</span>
            <span className="gradient-text">Intelligent Insights</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto text-base xs:text-lg sm:text-xl text-slate-400 mb-8 sm:mb-10 px-2"
          >
            Harness the power of advanced AI to analyze, understand, and extract
            valuable insights from your documents in seconds. Experience the future
            of document intelligence.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col xs:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-16"
          >
            <button onClick={() => scrollTo('pricing')} className="btn-primary group w-full xs:w-auto min-h-[48px] flex items-center justify-center">
              <span className="relative z-10 flex items-center gap-2">
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button onClick={() => scrollTo('how-it-works')} className="btn-secondary group w-full xs:w-auto min-h-[48px] flex items-center justify-center">
              <Play className="w-4 h-4 mr-2" />
              See How It Works
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 xs:gap-6 sm:gap-8 max-w-3xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                className="text-center p-3 xs:p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/5"
              >
                <div className="text-2xl xs:text-3xl sm:text-4xl font-bold gradient-text mb-1">
                  {stat.value}
                </div>
                <div className="text-xs xs:text-sm text-slate-500">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Floating Icons */}
          <div className="absolute inset-0 pointer-events-none">
            {floatingIcons.map(({ Icon, delay, x, y }, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 0.6, 
                  scale: 1,
                  y: [y, y - 20, y],
                }}
                transition={{
                  opacity: { duration: 0.5, delay },
                  scale: { duration: 0.5, delay },
                  y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
                }}
                className="absolute top-1/2 left-1/2 hidden lg:block"
                style={{ x, y }}
              >
                <div className="p-4 rounded-2xl glass-strong">
                  <Icon className="w-6 h-6 text-primary-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Product Demo */}
        <ProductDemo />
      </div>
    </section>
  );
}
