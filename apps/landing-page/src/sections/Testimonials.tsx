import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useScrollTo } from '../lib/useScrollTo';

const testimonials = [
  {
    content: "NexusAI has completely transformed how we handle legal documents. What used to take our team days now takes minutes. The accuracy is remarkable.",
    author: 'Sarah Chen',
    role: 'General Counsel',
    company: 'TechVentures Inc.',
    avatar: 'SC',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    content: "The semantic search feature is a game-changer. I can ask complex questions about our research papers and get instant, relevant answers. It's like having a research assistant that never sleeps.",
    author: 'Dr. Michael Torres',
    role: 'Head of Research',
    company: 'BioGenetics Lab',
    avatar: 'MT',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    content: "We processed over 100,000 customer contracts in a single week. The insights we gained helped us identify $2M in revenue opportunities. ROI was immediate.",
    author: 'Jennifer Walsh',
    role: 'VP of Operations',
    company: 'GlobalTrade Co.',
    avatar: 'JW',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    content: "Security was our top concern. NexusAI's enterprise features and SOC 2 compliance gave us the confidence to move forward. Implementation was seamless.",
    author: 'Robert Kim',
    role: 'CISO',
    company: 'SecureBank Financial',
    avatar: 'RK',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    content: "The API integration was incredibly smooth. We had NexusAI powering our document workflow within a day. Their developer docs are top-notch.",
    author: 'Alex Rivera',
    role: 'Lead Engineer',
    company: 'StartupFlow',
    avatar: 'AR',
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    content: "Our customer support team reduced response times by 60% using NexusAI to search our knowledge base. Customer satisfaction scores are at an all-time high.",
    author: 'Emily Chang',
    role: 'Customer Success Director',
    company: 'ServicePro',
    avatar: 'EC',
    gradient: 'from-pink-500 to-rose-500',
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

export function Testimonials() {
  const { scrollTo } = useScrollTo();

  return (
    <section id="testimonials" className="py-16 sm:py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 xs:px-6 sm:px-8 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-16 lg:mb-20"
        >
          <h2 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            <span className="text-white">Loved by Teams </span>
            <span className="gradient-text">Worldwide</span>
          </h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base lg:text-lg text-slate-400 px-2">
            See what industry leaders are saying about their experience with NexusAI.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              variants={itemVariants}
              className={`group ${index === 1 ? 'lg:translate-y-8' : ''} ${index === 4 ? 'lg:translate-y-8' : ''}`}
            >
              <div className="relative h-full p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl glass transition-all duration-300 hover:bg-white/10">
                {/* Quote Icon */}
                <div className="absolute -top-2 -left-2 sm:-top-3 sm:-left-3 w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-white/10 flex items-center justify-center">
                  <Quote className="w-3 sm:w-4 h-3 sm:h-4 text-primary-400" />
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5 sm:gap-1 mb-3 sm:mb-4 pt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 sm:w-4 h-3 sm:h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-xs sm:text-sm lg:text-base text-slate-300 leading-relaxed mb-4 sm:mb-6">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className={`w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white text-sm sm:text-base font-semibold flex-shrink-0`}
                  >
                    {testimonial.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white text-sm sm:text-base truncate">{testimonial.author}</div>
                    <div className="text-xs sm:text-sm text-slate-400 truncate">
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
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 sm:mt-16 lg:mt-20 text-center"
        >
          <p className="text-sm sm:text-base text-slate-400 mb-6">
            Join thousands of satisfied customers
          </p>
          <button onClick={() => scrollTo('pricing')} className="btn-primary inline-flex min-h-[48px] items-center">
            <span className="relative z-10">Get Started Today</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
