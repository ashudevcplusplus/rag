import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useScrollTo } from '../lib/useScrollTo';

const testimonials = [
  {
    content: "We built a support chatbot in 20 minutes using our docs. The ability to choose Claude over GPT-4 was a game-changer for our use case.",
    author: 'Sarah Chen',
    role: 'CTO',
    company: 'TechFlow',
  },
  {
    content: "The chunking configuration made all the difference. We fine-tuned overlap settings and saw a 40% improvement in retrieval accuracy.",
    author: 'Michael Torres',
    role: 'ML Engineer',
    company: 'DataScale',
  },
  {
    content: "Finally, a platform that lets us use our own embedding provider. We switched to Voyage AI and cut our costs by 60%.",
    author: 'Jennifer Walsh',
    role: 'VP Engineering',
    company: 'CloudOps',
  },
  {
    content: "No-code chatbot building with enterprise-grade flexibility. Our team deployed 5 customer-facing bots in a single week.",
    author: 'Robert Kim',
    role: 'Product Lead',
    company: 'Nextera',
  },
  {
    content: "The multi-model support is incredible. We use GPT-4 for complex queries and Mistral for simple ones to optimize costs.",
    author: 'Alex Rivera',
    role: 'AI Architect',
    company: 'InnovateLabs',
  },
  {
    content: "Uploaded 500+ documents and had a working knowledge base chatbot the same day. The RAG pipeline just works.",
    author: 'Emily Chang',
    role: 'Knowledge Manager',
    company: 'GlobalServe',
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
  const { scrollTo } = useScrollTo();

  return (
    <section id="testimonials" className="py-24 sm:py-32 lg:py-40 relative">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 lg:mb-20"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-white">Teams love the </span>
            <span className="gradient-text">flexibility</span>
          </h2>
          <p className="max-w-xl mx-auto text-lg text-slate-400">
            See why developers and teams choose NexusAI for their chatbot needs.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              variants={itemVariants}
              className={`group ${index === 1 || index === 4 ? 'lg:translate-y-6' : ''}`}
            >
              <div className="relative h-full p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] transition-all duration-500 hover:bg-white/[0.04] hover:border-white/[0.08]">
                {/* Quote Icon */}
                <Quote className="w-8 h-8 text-primary-500/20 mb-4" />

                {/* Stars */}
                <div className="flex items-center gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary-400 text-primary-400" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-slate-300 leading-relaxed mb-6">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-white text-sm font-medium">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">{testimonial.author}</div>
                    <div className="text-xs text-slate-500">
                      {testimonial.role}, {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-slate-400 mb-6">
            Join hundreds of teams building smarter chatbots
          </p>
          <button onClick={() => scrollTo('pricing')} className="btn-primary">
            <span className="relative z-10">Start Building Free</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
