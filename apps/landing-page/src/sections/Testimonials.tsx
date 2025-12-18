import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote: "Oprag.ai gave us the freedom to use Claude for our enterprise chatbot while keeping our embedding pipeline on OpenAI. Perfect flexibility.",
    author: 'Sarah Chen',
    role: 'CTO',
    company: 'TechFlow',
    avatar: 'SC',
    gradient: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    quote: "The chunking configuration was a game-changer. We optimized our chunk overlap and saw a 40% improvement in answer relevance.",
    author: 'Michael Roberts',
    role: 'AI Engineer',
    company: 'DataScale',
    avatar: 'MR',
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  {
    quote: "We went from idea to production chatbot in under 2 hours. Just uploaded our docs, picked GPT-4, and deployed. Incredible.",
    author: 'Emily Watson',
    role: 'Product Lead',
    company: 'InnovateCo',
    avatar: 'EW',
    gradient: 'from-green-500/20 to-emerald-500/20',
  },
  {
    quote: "Being able to switch between LLM providers without code changes saved us thousands in testing different models.",
    author: 'James Park',
    role: 'VP Engineering',
    company: 'CloudFirst',
    avatar: 'JP',
    gradient: 'from-orange-500/20 to-amber-500/20',
  },
  {
    quote: "Our customer support team loves their new AI assistant. Setup was so simple even our non-technical staff could configure it.",
    author: 'Lisa Martinez',
    role: 'Customer Success',
    company: 'SupportPro',
    avatar: 'LM',
    gradient: 'from-red-500/20 to-rose-500/20',
  },
  {
    quote: "The ability to use Cohere embeddings with Anthropic's Claude is exactly what we needed. Oprag.ai makes it effortless.",
    author: 'David Kim',
    role: 'ML Engineer',
    company: 'AILabs',
    avatar: 'DK',
    gradient: 'from-indigo-500/20 to-violet-500/20',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 sm:py-32 lg:py-40 relative">
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
            <span className="text-white">Loved by </span>
            <span className="gradient-text">builders</span>
          </h2>
          <p className="max-w-xl mx-auto text-lg text-slate-400">
            See how teams are building smarter AI chatbots with Oprag.ai
          </p>
        </motion.div>

        {/* Testimonial Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.author}
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.01 }}
              className="group relative"
            >
              <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all duration-500 h-full flex flex-col">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-slate-300 leading-relaxed mb-6 flex-grow">
                  "{testimonial.quote}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center`}>
                    <span className="text-sm font-medium text-white">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">{testimonial.author}</div>
                    <div className="text-xs text-slate-500">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
