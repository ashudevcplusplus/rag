import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export function CTA() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          {/* Main Card */}
          <div className="relative rounded-3xl overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-accent-600 to-primary-600 bg-[length:200%_100%] animate-gradient" />
            
            {/* Pattern Overlay */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* Content */}
            <div className="relative px-8 py-16 sm:px-16 sm:py-24 text-center">
              {/* Floating Elements */}
              <motion.div
                animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute top-8 left-8 w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute bottom-8 right-8 w-20 h-20 rounded-full bg-white/10 backdrop-blur hidden sm:block"
              />
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute top-1/2 right-16 w-8 h-8 rounded-full bg-white/20 hidden lg:block"
              />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                  Ready to Transform Your
                  <br />
                  Document Workflow?
                </h2>
                <p className="max-w-2xl mx-auto text-lg sm:text-xl text-white/80 mb-10">
                  Join thousands of companies already using NexusAI to unlock
                  the power of their documents. Start your free trial today.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="#"
                    className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 font-semibold rounded-full hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                  <a
                    href="#"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-all duration-300 backdrop-blur"
                  >
                    Schedule Demo
                  </a>
                </div>

                <p className="mt-6 text-sm text-white/60">
                  No credit card required • 14-day free trial • Cancel anytime
                </p>
              </motion.div>
            </div>
          </div>

          {/* Glow Effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/30 via-accent-500/30 to-primary-500/30 blur-3xl -z-10" />
        </motion.div>
      </div>
    </section>
  );
}
