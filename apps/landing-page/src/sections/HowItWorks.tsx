import { motion } from 'framer-motion';
import { Upload, Cpu, Search, Lightbulb } from 'lucide-react';
import { cn } from '../lib/utils';

const steps = [
  {
    icon: Upload,
    number: '01',
    title: 'Upload Your Documents',
    description: 'Drag and drop your files or connect your existing data sources. We support PDFs, Word docs, images, and 50+ formats.',
    color: 'primary',
  },
  {
    icon: Cpu,
    number: '02',
    title: 'AI Processing',
    description: 'Our advanced AI models analyze, extract, and structure your data with industry-leading accuracy.',
    color: 'accent',
  },
  {
    icon: Search,
    number: '03',
    title: 'Semantic Search',
    description: 'Ask questions in natural language. Our AI understands context and finds relevant information instantly.',
    color: 'primary',
  },
  {
    icon: Lightbulb,
    number: '04',
    title: 'Actionable Insights',
    description: 'Get summaries, analytics, and recommendations that drive smarter business decisions.',
    color: 'accent',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-32 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-950/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="text-white">How It </span>
            <span className="gradient-text">Works</span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-slate-400">
            Get started in minutes. Our streamlined workflow takes you from raw documents
            to actionable insights effortlessly.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary-500/30 to-transparent -translate-y-1/2" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative group"
              >
                {/* Card */}
                <div className="relative z-10 p-6 rounded-2xl glass transition-all duration-300 group-hover:bg-white/10 h-full">
                  {/* Number Badge */}
                  <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-400">{step.number}</span>
                  </div>

                  {/* Icon */}
                  <div className="mb-6">
                    <div
                      className={cn(
                        'w-16 h-16 rounded-2xl flex items-center justify-center relative',
                        step.color === 'primary'
                          ? 'bg-primary-500/10 border border-primary-500/20'
                          : 'bg-accent-500/10 border border-accent-500/20'
                      )}
                    >
                      <step.icon
                        className={cn(
                          'w-8 h-8',
                          step.color === 'primary' ? 'text-primary-400' : 'text-accent-400'
                        )}
                      />
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.5, 0.2, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className={cn(
                          'absolute inset-0 rounded-2xl',
                          step.color === 'primary' ? 'bg-primary-500/20' : 'bg-accent-500/20'
                        )}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-20">
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center"
                    >
                      <svg
                        className="w-4 h-4 text-primary-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Demo Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-16"
        >
          <a href="#" className="btn-primary inline-flex">
            <span className="relative z-10">Try Interactive Demo</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
