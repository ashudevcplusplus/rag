import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useScrollTo } from '../lib/useScrollTo';

export function CTA() {
  const { scrollTo } = useScrollTo();

  return (
    <section className="py-24 sm:py-32 lg:py-40 relative">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          {/* Main Card */}
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-500 to-accent-600" />
            
            {/* Subtle pattern */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '32px 32px',
              }}
            />

            {/* Content */}
            <div className="relative px-8 py-16 sm:px-16 sm:py-20 lg:py-24 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                  Ready to transform your
                  <br />
                  document workflow?
                </h2>
                <p className="max-w-lg mx-auto text-lg text-white/80 mb-10">
                  Join thousands of companies using NexusAI to unlock 
                  the power of their documents.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={() => scrollTo('pricing')}
                    className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary-600 font-semibold rounded-full hover:bg-white/90 transition-all duration-300"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => scrollTo('contact')}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
                  >
                    Talk to Sales
                  </button>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Glow Effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/20 via-accent-500/20 to-primary-500/20 blur-3xl -z-10 rounded-3xl" />
        </motion.div>
      </div>
    </section>
  );
}
