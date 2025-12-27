import { motion } from 'framer-motion';
import { ArrowRight, Bot, Sparkles, Zap } from 'lucide-react';
import { useScrollTo } from '../lib/useScrollTo';

const features = [
  { icon: Bot, text: 'Unlimited chatbots' },
  { icon: Sparkles, text: '10+ LLM models' },
  { icon: Zap, text: 'Custom RAG config' },
];

export function CTA() {
  const { scrollTo } = useScrollTo();

  return (
    <section className="py-24 sm:py-32 relative">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-slate-900 to-accent-500/20" />
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" />
          
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-radial from-primary-500/30 to-transparent blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-radial from-accent-500/30 to-transparent blur-3xl" />
          
          {/* Border */}
          <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />

          <div className="relative z-10 px-8 py-16 sm:px-16 sm:py-20 text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-sm text-slate-300">Free tier available</span>
            </motion.div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              <span className="text-white">Build your AI chatbot</span>
              <br />
              <span className="gradient-text">in minutes, not months</span>
            </h2>
            
            <p className="max-w-xl mx-auto text-lg text-slate-400 mb-10">
              Join teams who build smarter chatbots with Oprag.ai. 
              Full flexibility, no vendor lock-in.
            </p>

            {/* Features */}
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08]"
                >
                  <feature.icon className="w-4 h-4 text-primary-400" />
                  <span className="text-sm text-white">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button 
                onClick={() => scrollTo('pricing')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group px-8 py-4 rounded-full bg-white text-slate-900 font-medium hover:bg-slate-100 transition-all duration-300 shadow-2xl shadow-white/20"
              >
                <span className="flex items-center gap-2">
                  Start Building Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
              <motion.button 
                onClick={() => scrollTo('contact')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 rounded-full text-white font-medium border border-white/[0.15] hover:bg-white/[0.05] transition-all"
              >
                Contact Sales
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
