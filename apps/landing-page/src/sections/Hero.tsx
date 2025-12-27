import { motion } from 'framer-motion';
import { ArrowRight, Play, Bot, Blocks, Sparkles } from 'lucide-react';
import { ProductDemo } from '../components/ProductDemo';
import { ScrollIndicator } from '../components/ScrollIndicator';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { useScrollTo } from '../lib/useScrollTo';

const stats = [
  { value: '10+', label: 'LLM Models Supported' },
  { value: '5+', label: 'Embedding Providers' },
  { value: '99.9%', label: 'Platform Uptime' },
  { value: '< 2min', label: 'Setup Time' },
];

const highlights = [
  { icon: Bot, text: 'Build AI Chatbots' },
  { icon: Blocks, text: 'Choose Any LLM' },
  { icon: Sparkles, text: 'Custom RAG Config' },
];

export function Hero() {
  const { scrollTo } = useScrollTo();

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-20 sm:pb-32">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
            </span>
            <span className="text-sm text-primary-300 font-medium">
              New: 10+ LLM Models Now Available
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1]"
          >
            <span className="text-white">Build AI Chatbots</span>
            <br />
            <span className="gradient-text">Your Way</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 mb-8 leading-relaxed"
          >
            Upload your knowledge files, choose your LLM and embedding provider, 
            configure chunking — and deploy intelligent chatbots in minutes.
          </motion.p>

          {/* Feature Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-10"
          >
            {highlights.map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] cursor-default"
              >
                <item.icon className="w-4 h-4 text-primary-400" />
                <span className="text-sm text-slate-300">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <motion.button 
              onClick={() => scrollTo('pricing')} 
              className="btn-primary group w-full sm:w-auto"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Building Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </motion.button>
            <motion.button 
              onClick={() => scrollTo('how-it-works')} 
              className="btn-secondary group w-full sm:w-auto"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-4 h-4 mr-2 opacity-70" />
              See How It Works
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-3xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -4 }}
                className="text-center group cursor-default p-4 rounded-xl hover:bg-white/[0.02] transition-all duration-300"
              >
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1 group-hover:text-primary-400 transition-colors duration-300">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="text-xs sm:text-sm text-slate-500 group-hover:text-slate-400 transition-colors">{stat.label}</div>
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
