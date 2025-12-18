import { motion } from 'framer-motion';
import { Upload, Cpu, Search, Lightbulb, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useScrollTo } from '../lib/useScrollTo';

const steps = [
  {
    icon: Upload,
    number: '01',
    title: 'Upload Documents',
    description: 'Drag and drop your files or connect data sources. Supports PDFs, Word, images, and 50+ formats.',
  },
  {
    icon: Cpu,
    number: '02',
    title: 'AI Processing',
    description: 'Our AI models analyze, extract, and structure your data with industry-leading accuracy.',
  },
  {
    icon: Search,
    number: '03',
    title: 'Semantic Search',
    description: 'Ask questions in natural language. Our AI understands context and finds relevant info instantly.',
  },
  {
    icon: Lightbulb,
    number: '04',
    title: 'Get Insights',
    description: 'Receive summaries, analytics, and recommendations that drive smarter decisions.',
  },
];

export function HowItWorks() {
  const { scrollTo } = useScrollTo();

  return (
    <section id="how-it-works" className="py-24 sm:py-32 lg:py-40 relative">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-950/20 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 lg:mb-20"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-white">How it </span>
            <span className="gradient-text">works</span>
          </h2>
          <p className="max-w-xl mx-auto text-lg text-slate-400">
            Get started in minutes. From raw documents to actionable insights effortlessly.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative group text-center lg:text-left"
              >
                {/* Number */}
                <div className="text-6xl font-bold text-white/[0.03] mb-4 lg:absolute lg:-top-4 lg:-left-2">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="relative inline-flex mb-6">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300',
                      index % 2 === 0
                        ? 'bg-primary-500/10 group-hover:bg-primary-500/20'
                        : 'bg-accent-500/10 group-hover:bg-accent-500/20'
                    )}
                  >
                    <step.icon
                      className={cn(
                        'w-7 h-7',
                        index % 2 === 0 ? 'text-primary-400' : 'text-accent-400'
                      )}
                    />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {step.description}
                </p>

                {/* Arrow for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-20 -right-4 text-white/10">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-16"
        >
          <button onClick={() => scrollTo('pricing')} className="btn-primary">
            <span className="relative z-10">Get Started Now</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
