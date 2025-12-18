import { motion } from 'framer-motion';
import {
  Bot,
  Blocks,
  Settings2,
  Upload,
  Zap,
  Shield,
} from 'lucide-react';

const features = [
  {
    icon: Blocks,
    title: 'Multiple LLM Providers',
    description: 'Choose from OpenAI, Anthropic, Google AI, Mistral, and more. Switch providers without changing code.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-400',
  },
  {
    icon: Bot,
    title: 'Flexible Embeddings',
    description: 'Use OpenAI, Cohere, Voyage AI, or any compatible embedding model. Mix and match with your LLM.',
    gradient: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
  },
  {
    icon: Settings2,
    title: 'Custom Chunk Config',
    description: 'Fine-tune chunk size and overlap to optimize retrieval for your specific documents and use case.',
    gradient: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-400',
  },
  {
    icon: Upload,
    title: 'Simple File Upload',
    description: 'Just drag and drop your documents. PDFs, Markdown, Word, text files — we handle them all.',
    gradient: 'from-green-500/20 to-emerald-500/20',
    iconColor: 'text-green-400',
  },
  {
    icon: Zap,
    title: 'Instant Chatbots',
    description: 'From file upload to deployed chatbot in minutes. No ML expertise required.',
    gradient: 'from-rose-500/20 to-pink-500/20',
    iconColor: 'text-rose-400',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with data encryption at rest and in transit. Your data stays yours.',
    gradient: 'from-slate-500/20 to-slate-400/20',
    iconColor: 'text-slate-400',
  },
];

const providers = [
  { name: 'OpenAI', type: 'LLM & Embeddings' },
  { name: 'Anthropic', type: 'LLM' },
  { name: 'Google AI', type: 'LLM & Embeddings' },
  { name: 'Cohere', type: 'LLM & Embeddings' },
  { name: 'Mistral', type: 'LLM' },
  { name: 'Voyage AI', type: 'Embeddings' },
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
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-white">Full flexibility </span>
            <span className="gradient-text">to build your way</span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-slate-400">
            No more vendor lock-in. Choose the best LLM, embeddings, and configuration for your needs.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.01 }}
              className="group relative"
            >
              <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all duration-500 h-full">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-primary-300 transition-colors">
                  {feature.title}
                </h3>
                
                <p className="text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Providers Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="text-center mb-10">
            <h3 className="text-xl font-semibold text-white mb-2">Supported Providers</h3>
            <p className="text-slate-400">Integrate with the best AI providers in the industry</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {providers.map((provider, index) => (
              <motion.div
                key={provider.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -2, scale: 1.02 }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all cursor-default"
              >
                <span className="text-sm font-medium text-white">{provider.name}</span>
                <span className="text-xs text-slate-500">{provider.type}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
