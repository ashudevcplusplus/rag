import { motion } from 'framer-motion';
import { Upload, Settings, Bot, Rocket, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useScrollTo } from '../lib/useScrollTo';

const steps = [
  {
    icon: Upload,
    number: '01',
    title: 'Upload Knowledge',
    description: 'Drag and drop your files — PDFs, docs, CSVs, or paste URLs. We process 50+ formats automatically.',
  },
  {
    icon: Settings,
    number: '02',
    title: 'Configure Your Stack',
    description: 'Select your LLM, embedding provider, chunk size, and overlap settings. Full control, zero code.',
  },
  {
    icon: Bot,
    number: '03',
    title: 'Train Your Chatbot',
    description: 'Our RAG pipeline indexes your content with your chosen embeddings for accurate retrieval.',
  },
  {
    icon: Rocket,
    number: '04',
    title: 'Deploy & Share',
    description: 'Get an instant API endpoint or embed the chatbot on your site. Start conversations immediately.',
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
            <span className="text-white">From files to chatbot </span>
            <span className="gradient-text">in minutes</span>
          </h2>
          <p className="max-w-xl mx-auto text-lg text-slate-400">
            No coding required. Upload your knowledge, configure your AI, and deploy.
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

        {/* Example Config Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20"
        >
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-8 sm:p-10">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Complete flexibility, zero complexity
                </h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Configure every aspect of your RAG pipeline through an intuitive interface. 
                  Change models, adjust chunking strategies, and optimize retrieval — all without touching code.
                </p>
                <ul className="space-y-3">
                  {[
                    'Choose from 10+ LLM models',
                    'Select embedding providers (OpenAI, Cohere, etc.)',
                    'Configure chunk size & overlap',
                    'Adjust retrieval parameters',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="rounded-xl bg-slate-900/80 border border-white/[0.05] p-6 font-mono text-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-500">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  <span className="ml-2 text-xs">config.yaml</span>
                </div>
                <div className="space-y-2 text-slate-400">
                  <div><span className="text-slate-500"># LLM Configuration</span></div>
                  <div><span className="text-primary-400">model:</span> <span className="text-accent-300">"claude-3-sonnet"</span></div>
                  <div><span className="text-primary-400">temperature:</span> <span className="text-green-400">0.7</span></div>
                  <div className="pt-2"><span className="text-slate-500"># Embedding Settings</span></div>
                  <div><span className="text-primary-400">embedding_model:</span> <span className="text-accent-300">"voyage-large-2"</span></div>
                  <div className="pt-2"><span className="text-slate-500"># Chunking Strategy</span></div>
                  <div><span className="text-primary-400">chunk_size:</span> <span className="text-green-400">1024</span></div>
                  <div><span className="text-primary-400">chunk_overlap:</span> <span className="text-green-400">128</span></div>
                  <div><span className="text-primary-400">splitter:</span> <span className="text-accent-300">"recursive"</span></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-16"
        >
          <button onClick={() => scrollTo('pricing')} className="btn-primary">
            <span className="relative z-10">Start Building Free</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
