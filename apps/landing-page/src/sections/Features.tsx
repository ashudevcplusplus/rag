import { motion } from 'framer-motion';
import { 
  FileSearch, 
  Brain, 
  Zap, 
  Shield, 
  BarChart3, 
  Globe,
  Sparkles,
  Lock
} from 'lucide-react';
import { cn } from '../lib/utils';

const features = [
  {
    icon: FileSearch,
    title: 'Intelligent Document Search',
    description: 'Find exactly what you need with AI-powered semantic search across all your documents.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Brain,
    title: 'Advanced AI Analysis',
    description: 'Leverage cutting-edge machine learning to extract insights, summaries, and key entities.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Zap,
    title: 'Lightning Fast Processing',
    description: 'Process thousands of documents in minutes with our optimized parallel processing engine.',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade encryption and compliance with SOC 2, HIPAA, and GDPR standards.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: BarChart3,
    title: 'Rich Analytics',
    description: 'Visualize trends, patterns, and anomalies with interactive dashboards and reports.',
    gradient: 'from-red-500 to-rose-500',
  },
  {
    icon: Globe,
    title: 'Multi-Language Support',
    description: 'Analyze documents in 50+ languages with automatic translation and context preservation.',
    gradient: 'from-indigo-500 to-violet-500',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function Features() {
  return (
    <section id="features" className="py-16 sm:py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 xs:px-6 sm:px-8 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-16 lg:mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full glass mb-4 sm:mb-6">
            <Sparkles className="w-4 h-4 text-primary-400" />
            <span className="text-xs sm:text-sm font-medium text-slate-300">Powerful Features</span>
          </div>
          <h2 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            <span className="text-white">Everything You Need to </span>
            <span className="gradient-text">Unlock Your Data</span>
          </h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base lg:text-lg text-slate-400 px-2">
            Our comprehensive suite of AI-powered tools gives you complete control
            over your document intelligence workflow.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="group relative"
            >
              <div className="card-glow rounded-xl sm:rounded-2xl h-full">
                <div className="relative z-10 p-5 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl glass h-full transition-all duration-300 group-hover:bg-white/10 group-hover:shadow-lg group-hover:shadow-primary-500/10">
                  {/* Icon */}
                  <div className="mb-4 sm:mb-6 relative">
                    <div
                      className={cn(
                        'w-12 sm:w-14 h-12 sm:h-14 rounded-lg sm:rounded-xl flex items-center justify-center',
                        'bg-gradient-to-br',
                        feature.gradient
                      )}
                    >
                      <feature.icon className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
                    </div>
                    <div
                      className={cn(
                        'absolute inset-0 rounded-lg sm:rounded-xl blur-xl opacity-40',
                        'bg-gradient-to-br',
                        feature.gradient
                      )}
                    />
                  </div>

                  {/* Content */}
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white mb-2 sm:mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm lg:text-base text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Feature Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-12 sm:mt-16 lg:mt-20"
        >
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden glass">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-transparent to-accent-500/10" />
            <div className="relative p-5 xs:p-6 sm:p-10 lg:p-16">
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4 sm:mb-6">
                    <Lock className="w-3 sm:w-4 h-3 sm:h-4 text-primary-400" />
                    <span className="text-xs sm:text-sm font-medium text-primary-300">Enterprise Ready</span>
                  </div>
                  <h3 className="text-xl xs:text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">
                    Built for Scale, Designed for Security
                  </h3>
                  <p className="text-sm sm:text-base lg:text-lg text-slate-400 mb-6 sm:mb-8">
                    From startups to Fortune 500 companies, our platform scales with your needs
                    while maintaining the highest security standards.
                  </p>
                  <div className="grid grid-cols-2 gap-4 sm:gap-6">
                    {[
                      { value: '99.99%', label: 'Uptime SLA' },
                      { value: '<100ms', label: 'API Response' },
                      { value: 'SOC 2', label: 'Certified' },
                      { value: '256-bit', label: 'Encryption' },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <div className="text-lg xs:text-xl sm:text-2xl font-bold text-white">{stat.value}</div>
                        <div className="text-xs sm:text-sm text-slate-500">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative hidden sm:block">
                  <div className="aspect-square rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 p-4 sm:p-6 lg:p-8">
                    <div className="h-full rounded-lg sm:rounded-xl border border-white/10 bg-slate-900/50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 sm:w-20 lg:w-24 h-16 sm:h-20 lg:h-24 mx-auto mb-4 sm:mb-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                          <Shield className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 text-white" />
                        </div>
                        <div className="text-base sm:text-lg lg:text-xl font-semibold text-white mb-1 sm:mb-2">
                          Enterprise Grade
                        </div>
                        <div className="text-xs sm:text-sm text-slate-400">
                          Security & Compliance
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
