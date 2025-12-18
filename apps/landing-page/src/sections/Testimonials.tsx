import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useScrollTo } from '../lib/useScrollTo';

const testimonials = [
  {
    content: "NexusAI transformed how we handle legal documents. What took days now takes minutes.",
    author: 'Sarah Chen',
    role: 'General Counsel',
    company: 'TechVentures',
  },
  {
    content: "The semantic search is incredible. I ask complex questions and get instant, relevant answers.",
    author: 'Dr. Michael Torres',
    role: 'Head of Research',
    company: 'BioGenetics Lab',
  },
  {
    content: "We processed 100K contracts in a week and identified $2M in opportunities. Immediate ROI.",
    author: 'Jennifer Walsh',
    role: 'VP Operations',
    company: 'GlobalTrade',
  },
  {
    content: "Security was our top concern. SOC 2 compliance gave us the confidence to move forward.",
    author: 'Robert Kim',
    role: 'CISO',
    company: 'SecureBank',
  },
  {
    content: "API integration was seamless. We had NexusAI powering our workflow within a day.",
    author: 'Alex Rivera',
    role: 'Lead Engineer',
    company: 'StartupFlow',
  },
  {
    content: "Support response times dropped 60%. Customer satisfaction is at an all-time high.",
    author: 'Emily Chang',
    role: 'CS Director',
    company: 'ServicePro',
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
            <span className="text-white">Loved by teams </span>
            <span className="gradient-text">worldwide</span>
          </h2>
          <p className="max-w-xl mx-auto text-lg text-slate-400">
            See what industry leaders are saying about NexusAI.
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
            Join thousands of satisfied customers
          </p>
          <button onClick={() => scrollTo('pricing')} className="btn-primary">
            <span className="relative z-10">Start Free Trial</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
