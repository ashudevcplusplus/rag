import { motion } from 'framer-motion';
import { ArrowRight, Play, Zap, Shield, Cpu } from 'lucide-react';

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
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
            </span>
            <span className="text-sm font-medium text-slate-300">
              Introducing NexusAI v2.0 — Now with GPT-4 Integration
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
          >
            <span className="block text-white">Transform Your Data Into</span>
            <span className="gradient-text">Intelligent Insights</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 mb-10"
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
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <a href="#" className="btn-primary group">
              <span className="relative z-10 flex items-center gap-2">
                Start Free Trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
            <a href="#" className="btn-secondary group">
              <Play className="w-4 h-4 mr-2" />
              Watch Demo
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500">{stat.label}</div>
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

        {/* Hero Image/Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-20 relative"
        >
          <div className="relative rounded-2xl overflow-hidden glass p-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-transparent to-accent-500/20" />
            <div className="relative rounded-xl overflow-hidden bg-slate-900">
              {/* Mock Dashboard */}
              <div className="aspect-[16/9] p-6 sm:p-8">
                <div className="h-full rounded-lg border border-white/10 bg-slate-900/50 p-4 sm:p-6">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-6 rounded-md bg-white/5" />
                      <div className="w-16 h-6 rounded-md bg-primary-500/20" />
                    </div>
                  </div>

                  {/* Content Grid */}
                  <div className="grid grid-cols-3 gap-4 h-[calc(100%-3rem)]">
                    <div className="col-span-2 space-y-4">
                      <div className="h-1/2 rounded-lg bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-white/5 p-4">
                        <div className="w-32 h-4 rounded bg-white/10 mb-3" />
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary-500" />
                              <div className="flex-1 h-3 rounded bg-white/5" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="h-1/2 rounded-lg bg-white/5 border border-white/5 p-4">
                        <div className="w-24 h-4 rounded bg-white/10 mb-3" />
                        <div className="grid grid-cols-4 gap-2 h-[calc(100%-2rem)]">
                          {[40, 60, 80, 45].map((height, i) => (
                            <div key={i} className="flex items-end">
                              <div
                                className="w-full rounded-t bg-gradient-to-t from-primary-500 to-accent-500"
                                style={{ height: `${height}%` }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="h-1/3 rounded-lg bg-accent-500/10 border border-white/5 p-4">
                        <div className="w-16 h-3 rounded bg-white/10 mb-2" />
                        <div className="text-2xl font-bold text-accent-400">98.7%</div>
                      </div>
                      <div className="h-1/3 rounded-lg bg-primary-500/10 border border-white/5 p-4">
                        <div className="w-16 h-3 rounded bg-white/10 mb-2" />
                        <div className="text-2xl font-bold text-primary-400">1,234</div>
                      </div>
                      <div className="h-1/3 rounded-lg bg-white/5 border border-white/5 p-4">
                        <div className="w-16 h-3 rounded bg-white/10 mb-2" />
                        <div className="text-2xl font-bold text-white">Active</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Glow Effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/20 via-accent-500/20 to-primary-500/20 blur-3xl -z-10" />
        </motion.div>
      </div>
    </section>
  );
}
