import { motion } from 'framer-motion';
import { 
  FileSearch, 
  Brain, 
  Zap, 
  Shield, 
  BarChart3, 
  Globe,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';

const features = [
  {
    icon: FileSearch,
    title: 'Semantic Search',
    description: 'Find exactly what you need with AI-powered search across all your documents.',
    color: 'primary',
  },
  {
    icon: Brain,
    title: 'AI Analysis',
    description: 'Extract insights, summaries, and key entities with advanced machine learning.',
    color: 'accent',
  },
  {
    icon: Zap,
    title: 'Fast Processing',
    description: 'Process thousands of documents in minutes with parallel processing.',
    color: 'primary',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade encryption with SOC 2, HIPAA, and GDPR compliance.',
    color: 'accent',
  },
  {
    icon: BarChart3,
    title: 'Rich Analytics',
    description: 'Visualize trends and patterns with interactive dashboards.',
    color: 'primary',
  },
  {
    icon: Globe,
    title: '50+ Languages',
    description: 'Analyze documents in multiple languages with auto-translation.',
    color: 'accent',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-32 lg:py-40 relative">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 lg:mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] mb-6">
            <Sparkles className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-slate-400">Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-white">Everything you need to </span>
            <span className="gradient-text">unlock your data</span>
          </h2>
          <p className="max-w-xl mx-auto text-lg text-slate-400">
            A comprehensive suite of AI-powered tools for complete document intelligence.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group"
            >
              <div className="card-glow h-full">
                <div className="relative z-10 p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] h-full transition-all duration-500 group-hover:bg-white/[0.04] group-hover:border-white/[0.08]">
                  {/* Icon */}
                  <div className="mb-6">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300',
                        feature.color === 'primary'
                          ? 'bg-primary-500/10 group-hover:bg-primary-500/20'
                          : 'bg-accent-500/10 group-hover:bg-accent-500/20'
                      )}
                    >
                      <feature.icon
                        className={cn(
                          'w-6 h-6 transition-colors duration-300',
                          feature.color === 'primary' 
                            ? 'text-primary-400' 
                            : 'text-accent-400'
                        )}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-primary-300 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20"
        >
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary-500/10 via-accent-500/5 to-primary-500/10 border border-white/[0.05] p-8 sm:p-12">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  Built for scale & security
                </h3>
                <p className="text-slate-400 mb-8 leading-relaxed">
                  From startups to Fortune 500 companies, our platform scales with your needs 
                  while maintaining the highest security standards.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { value: '99.99%', label: 'Uptime SLA' },
                    { value: '<100ms', label: 'Response' },
                    { value: 'SOC 2', label: 'Certified' },
                    { value: '256-bit', label: 'Encryption' },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <div className="text-xl font-bold text-white">{stat.value}</div>
                      <div className="text-sm text-slate-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden lg:flex justify-center">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                  <Shield className="w-16 h-16 text-white/40" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
