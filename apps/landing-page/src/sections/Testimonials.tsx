import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

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
  return (
    <section id="testimonials" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="text-white">Loved by Teams </span>
            <span className="gradient-text">Worldwide</span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-slate-400">
            See what industry leaders are saying about their experience with NexusAI.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              variants={itemVariants}
              className={`group ${index === 1 ? 'lg:translate-y-8' : ''} ${index === 4 ? 'lg:translate-y-8' : ''}`}
            >
              <div className="relative h-full p-6 rounded-2xl glass transition-all duration-300 hover:bg-white/10">
                {/* Quote Icon */}
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-white/10 flex items-center justify-center">
                  <Quote className="w-4 h-4 text-primary-400" />
                </div>

                {/* Stars */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-slate-300 leading-relaxed mb-6">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-semibold`}
                  >
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{testimonial.author}</div>
                    <div className="text-sm text-slate-400">
                      {testimonial.role}, {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Company Logos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-20"
        >
          <p className="text-center text-sm text-slate-500 mb-8">
            TRUSTED BY LEADING COMPANIES
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 opacity-50">
            {['TechVentures', 'BioGenetics', 'GlobalTrade', 'SecureBank', 'StartupFlow', 'ServicePro'].map(
              (company) => (
                <div key={company} className="text-xl font-bold text-slate-400">
                  {company}
                </div>
              )
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
