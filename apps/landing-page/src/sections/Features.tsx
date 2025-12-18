import { motion } from 'framer-motion';
import { 
  Blocks, 
  Brain, 
  Sliders, 
  Upload, 
  MessageSquare, 
  Lock,
  Sparkles,
  Layers,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

const features = [
  {
    icon: Blocks,
    title: 'Multiple LLM Providers',
    description: 'Choose from OpenAI, Anthropic, Google, Mistral, Llama, and more. Switch models anytime.',
    color: 'primary',
  },
  {
    icon: Layers,
    title: 'Flexible Embeddings',
    description: 'Select your embedding provider — OpenAI, Cohere, Voyage AI, or bring your own.',
    color: 'accent',
  },
  {
    icon: Sliders,
    title: 'Custom Chunk Config',
    description: 'Fine-tune chunk size, overlap, and splitting strategies for optimal retrieval.',
    color: 'primary',
  },
  {
    icon: Upload,
    title: 'Simple File Upload',
    description: 'Drag and drop PDFs, docs, CSVs, or URLs. We handle the rest automatically.',
    color: 'accent',
  },
  {
    icon: MessageSquare,
    title: 'Instant Chatbots',
    description: 'Deploy conversational AI that understands your knowledge base in minutes.',
    color: 'primary',
  },
  {
    icon: Lock,
    title: 'Enterprise Security',
    description: 'Your data stays yours. SOC 2 compliant with end-to-end encryption.',
    color: 'accent',
  },
];

const providers = [
  { name: 'OpenAI', type: 'LLM & Embeddings' },
  { name: 'Anthropic', type: 'LLM' },
  { name: 'Google AI', type: 'LLM & Embeddings' },
  { name: 'Cohere', type: 'Embeddings' },
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
          className="text-center mb-16 lg:mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] mb-6">
            <Sparkles className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-slate-400">Full Flexibility</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-white">Build chatbots </span>
            <span className="gradient-text">your way</span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-slate-400">
            Complete control over your AI stack. Choose your models, configure your pipeline, 
            and create intelligent chatbots without writing code.
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

        {/* Providers Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20"
        >
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary-500/5 via-accent-500/5 to-primary-500/5 border border-white/[0.05] p-8 sm:p-12">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4">
                <Zap className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-xs font-medium text-primary-300">Supported Providers</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Integrate with the best AI providers
              </h3>
              <p className="text-slate-400 max-w-lg mx-auto">
                Mix and match LLM and embedding providers to optimize for cost, speed, or quality.
              </p>
            </div>

            {/* Provider Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {providers.map((provider, index) => (
                <motion.div
                  key={provider.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mx-auto mb-3">
                    <Brain className="w-5 h-5 text-white/60" />
                  </div>
                  <div className="font-medium text-white text-sm mb-1">{provider.name}</div>
                  <div className="text-xs text-slate-500">{provider.type}</div>
                </motion.div>
              ))}
            </div>

            {/* Config Preview */}
            <div className="mt-10 p-6 rounded-xl bg-slate-900/50 border border-white/[0.05]">
              <div className="flex items-center gap-2 mb-4">
                <Sliders className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-medium text-white">Example Configuration</span>
              </div>
              <div className="font-mono text-sm text-slate-400 space-y-1">
                <div><span className="text-primary-400">llm:</span> <span className="text-accent-300">"gpt-4-turbo"</span></div>
                <div><span className="text-primary-400">embedding:</span> <span className="text-accent-300">"text-embedding-3-large"</span></div>
                <div><span className="text-primary-400">chunk_size:</span> <span className="text-green-400">512</span></div>
                <div><span className="text-primary-400">chunk_overlap:</span> <span className="text-green-400">50</span></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
