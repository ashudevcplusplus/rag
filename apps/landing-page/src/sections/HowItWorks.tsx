import { motion } from 'framer-motion';
import { Upload, Settings, Brain, Share2 } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload Knowledge',
    description: 'Drag and drop your documents — PDFs, docs, markdown, or text files. We handle the parsing.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  {
    number: '02',
    icon: Settings,
    title: 'Configure Your Stack',
    description: 'Choose your LLM (GPT-4, Claude, Gemini...), embedding model, chunk size, and overlap settings.',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
  },
  {
    number: '03',
    icon: Brain,
    title: 'Train Your Chatbot',
    description: 'We automatically process your documents, create embeddings, and set up your RAG pipeline.',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
  {
    number: '04',
    icon: Share2,
    title: 'Deploy & Share',
    description: 'Get an API endpoint or embed the chat widget on your site. Share with your team instantly.',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32 lg:py-40 relative">
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
            <span className="text-white">From docs to chatbot </span>
            <span className="gradient-text">in 4 steps</span>
          </h2>
          <p className="max-w-xl mx-auto text-lg text-slate-400">
            Building an AI chatbot has never been simpler.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative"
        >
          {/* Connecting Line - Desktop */}
          <div className="hidden lg:block absolute top-1/2 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className="relative group"
              >
                {/* Step Number */}
                <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-slate-900 border border-white/10 z-10">
                  <span className={`text-xs font-mono font-medium ${step.color}`}>
                    {step.number}
                  </span>
                </div>

                <div className={`relative p-6 pt-8 rounded-2xl bg-white/[0.02] border ${step.borderColor} hover:border-opacity-50 hover:bg-white/[0.03] transition-all duration-500 h-full`}>
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl ${step.bgColor} border ${step.borderColor} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <step.icon className={`w-7 h-7 ${step.color}`} />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {step.title}
                  </h3>
                  
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow for desktop - between cards */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-20">
                    <div className="w-6 h-6 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center">
                      <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Example Config */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-16 max-w-xl mx-auto"
        >
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-white">Example Configuration</span>
              <span className="text-xs text-slate-500 font-mono">oprag.yaml</span>
            </div>
            <pre className="text-sm font-mono overflow-x-auto">
              <code className="text-slate-400">
                <span className="text-slate-500"># Your chatbot config</span>{'\n'}
                <span className="text-primary-400">llm</span>: <span className="text-green-400">gpt-4-turbo</span>{'\n'}
                <span className="text-primary-400">embeddings</span>: <span className="text-green-400">text-embedding-3-small</span>{'\n'}
                <span className="text-primary-400">chunk_size</span>: <span className="text-amber-400">512</span>{'\n'}
                <span className="text-primary-400">chunk_overlap</span>: <span className="text-amber-400">50</span>{'\n'}
                <span className="text-primary-400">knowledge</span>:{'\n'}
                {'  '}<span className="text-slate-500">- docs/</span>{'\n'}
                {'  '}<span className="text-slate-500">- faq.md</span>
              </code>
            </pre>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
