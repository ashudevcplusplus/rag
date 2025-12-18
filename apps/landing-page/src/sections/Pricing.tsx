import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { useScrollTo } from '../lib/useScrollTo';

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for small teams getting started',
    price: 49,
    popular: false,
    features: [
      '5,000 documents/month',
      'Basic semantic search',
      'Email support',
      '5 team members',
      'API access',
      '7-day data retention',
    ],
  },
  {
    name: 'Professional',
    description: 'For growing teams that need more power',
    price: 149,
    popular: true,
    features: [
      '50,000 documents/month',
      'Advanced AI analysis',
      'Priority support',
      'Unlimited team members',
      'Custom integrations',
      '90-day data retention',
      'Analytics dashboard',
      'Custom workflows',
    ],
  },
  {
    name: 'Enterprise',
    description: 'For organizations with advanced needs',
    price: null,
    popular: false,
    features: [
      'Unlimited documents',
      'Custom AI models',
      'Dedicated support',
      'SSO & SCIM',
      'On-premise deployment',
      'Unlimited retention',
      'SLA guarantee',
      'Custom training',
      'Compliance reports',
    ],
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

export function Pricing() {
  const { scrollTo } = useScrollTo();
  const [isYearly, setIsYearly] = useState(false);

  const getPrice = (monthlyPrice: number | null) => {
    if (monthlyPrice === null) return null;
    return isYearly ? Math.round(monthlyPrice * 0.8) : monthlyPrice;
  };

  return (
    <section id="pricing" className="py-16 sm:py-24 lg:py-32 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-950/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 xs:px-6 sm:px-8 lg:px-8 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-16 lg:mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full glass mb-4 sm:mb-6">
            <Zap className="w-4 h-4 text-accent-400" />
            <span className="text-xs sm:text-sm font-medium text-slate-300">Simple Pricing</span>
          </div>
          <h2 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            <span className="text-white">Choose Your </span>
            <span className="gradient-text">Perfect Plan</span>
          </h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base lg:text-lg text-slate-400 px-2">
            Start free for 14 days. No credit card required.
            Scale up as your needs grow.
          </p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center justify-center gap-4 mt-8"
          >
            <span className={cn(
              "text-sm font-medium transition-colors",
              !isYearly ? "text-white" : "text-slate-400"
            )}>
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-14 h-7 rounded-full bg-slate-800 border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              aria-label={isYearly ? "Switch to monthly billing" : "Switch to yearly billing"}
            >
              <motion.div
                animate={{ x: isYearly ? 28 : 4 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 w-5 h-5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
              />
            </button>
            <span className={cn(
              "text-sm font-medium transition-colors flex items-center gap-2",
              isYearly ? "text-white" : "text-slate-400"
            )}>
              Yearly
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                Save 20%
              </span>
            </span>
          </motion.div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              className={cn(
                'relative group',
                plan.popular && 'sm:-translate-y-4',
                /* Center the popular card on tablet (2-col grid) */
                index === 1 && 'sm:col-span-2 lg:col-span-1 sm:max-w-md sm:mx-auto lg:max-w-none'
              )}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                  <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium shadow-lg">
                    <Sparkles className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              <div
                className={cn(
                  'relative h-full rounded-2xl transition-all duration-300',
                  plan.popular
                    ? 'bg-gradient-to-b from-primary-500/20 via-accent-500/10 to-transparent p-[1px]'
                    : 'glass'
                )}
              >
                <div
                  className={cn(
                    'h-full rounded-2xl p-6 sm:p-8',
                    plan.popular ? 'bg-slate-900' : ''
                  )}
                >
                  {/* Plan Info */}
                  <div className="mb-6 sm:mb-8">
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-slate-400 text-xs sm:text-sm">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-6 sm:mb-8">
                    {plan.price !== null ? (
                      <div className="flex items-baseline gap-1">
                        <motion.span 
                          key={isYearly ? 'yearly' : 'monthly'}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-3xl sm:text-4xl font-bold text-white"
                        >
                          ${getPrice(plan.price)}
                        </motion.span>
                        <span className="text-slate-400 text-sm">
                          /{isYearly ? 'month, billed yearly' : 'month'}
                        </span>
                      </div>
                    ) : (
                      <div className="text-3xl sm:text-4xl font-bold text-white">Custom</div>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => scrollTo('contact')}
                    className={cn(
                      'block w-full py-3 min-h-[48px] rounded-xl text-center font-semibold transition-all duration-300 flex items-center justify-center',
                      plan.popular
                        ? 'btn-primary'
                        : 'btn-secondary'
                    )}
                  >
                    <span className="relative z-10 text-sm sm:text-base">
                      {plan.price !== null ? 'Get Started' : 'Contact Us'}
                    </span>
                  </button>

                  {/* Features */}
                  <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-primary-400" />
                        </div>
                        <span className="text-slate-300 text-xs sm:text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Contact Teaser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-10 sm:mt-16"
        >
          <p className="text-sm sm:text-base text-slate-400">
            Have questions?{' '}
            <button onClick={() => scrollTo('contact')} className="text-primary-400 hover:text-primary-300 font-medium">
              Get in touch with us
            </button>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
