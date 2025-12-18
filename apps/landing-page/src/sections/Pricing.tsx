import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { useScrollTo } from '../lib/useScrollTo';

const plans = [
  {
    name: 'Starter',
    description: 'For individuals & small projects',
    price: 29,
    features: [
      '3 chatbots',
      '10,000 messages/month',
      '100MB knowledge storage',
      '3 LLM models',
      '2 embedding providers',
      'Email support',
    ],
  },
  {
    name: 'Professional',
    description: 'For teams & growing businesses',
    price: 99,
    popular: true,
    features: [
      'Unlimited chatbots',
      '100,000 messages/month',
      '5GB knowledge storage',
      'All LLM models',
      'All embedding providers',
      'Custom chunk configs',
      'API access',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    description: 'For large organizations',
    price: null,
    features: [
      'Everything in Pro',
      'Unlimited messages',
      'Unlimited storage',
      'Custom LLM integration',
      'Bring your own keys',
      'SSO & SCIM',
      'Dedicated support',
      'SLA guarantee',
    ],
  },
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

export function Pricing() {
  const { scrollTo } = useScrollTo();
  const [isYearly, setIsYearly] = useState(false);

  const getPrice = (monthlyPrice: number | null) => {
    if (monthlyPrice === null) return null;
    return isYearly ? Math.round(monthlyPrice * 0.8) : monthlyPrice;
  };

  const getSavings = (monthlyPrice: number) => {
    return Math.round(monthlyPrice * 12 * 0.2);
  };

  return (
    <section id="pricing" className="py-24 sm:py-32 lg:py-40 relative">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-white">Start free, </span>
            <span className="gradient-text">scale as you grow</span>
          </h2>
          <p className="max-w-xl mx-auto text-lg text-slate-400 mb-8">
            No credit card required. Build your first chatbot in minutes.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={cn(
              "text-sm font-medium transition-colors",
              !isYearly ? "text-white" : "text-slate-500"
            )}>
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-14 h-7 rounded-full bg-slate-800 border border-white/10 transition-colors hover:border-white/20"
              aria-label={isYearly ? "Switch to monthly" : "Switch to yearly"}
            >
              <motion.div
                animate={{ x: isYearly ? 28 : 4 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 w-5 h-5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
              />
            </button>
            <span className={cn(
              "text-sm font-medium transition-colors flex items-center gap-2",
              isYearly ? "text-white" : "text-slate-500"
            )}>
              Yearly
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/20">
                Save 20%
              </span>
            </span>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              whileHover={{ y: plan.popular ? -8 : -4 }}
              className={cn(
                'relative group',
                plan.popular && 'md:-translate-y-4'
              )}
            >
              {/* Popular Badge - Enhanced */}
              {plan.popular && (
                <motion.div 
                  className="absolute -top-5 left-1/2 -translate-x-1/2 z-10"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs font-medium shadow-lg shadow-primary-500/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    Most Popular
                  </div>
                </motion.div>
              )}

              <div
                className={cn(
                  'relative h-full rounded-2xl transition-all duration-500',
                  plan.popular
                    ? 'bg-gradient-to-b from-primary-500/20 via-primary-500/10 to-transparent border-2 border-primary-500/30 shadow-xl shadow-primary-500/10'
                    : 'bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1]'
                )}
              >
                <div className="p-8">
                  {/* Plan Info */}
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-white mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-slate-400">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    {plan.price !== null ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <motion.span 
                            key={isYearly ? 'yearly' : 'monthly'}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl font-bold text-white"
                          >
                            ${getPrice(plan.price)}
                          </motion.span>
                          <span className="text-slate-500 text-sm">/mo</span>
                        </div>
                        {isYearly && (
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-green-400 mt-1"
                          >
                            Save ${getSavings(plan.price)}/year
                          </motion.p>
                        )}
                      </>
                    ) : (
                      <div className="text-4xl font-bold text-white">Custom</div>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => scrollTo('contact')}
                    className={cn(
                      'w-full py-3.5 rounded-xl font-medium transition-all duration-300',
                      plan.popular
                        ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:shadow-lg hover:shadow-primary-500/25'
                        : 'bg-white/[0.05] text-white border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12]'
                    )}
                  >
                    {plan.price !== null ? 'Start Free Trial' : 'Contact Sales'}
                  </button>

                  {/* Features */}
                  <div className="mt-8 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <div className={cn(
                          "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5",
                          plan.popular ? "bg-primary-500/20" : "bg-white/[0.05]"
                        )}>
                          <Check className={cn(
                            "w-3 h-3",
                            plan.popular ? "text-primary-400" : "text-slate-400"
                          )} />
                        </div>
                        <span className="text-sm text-slate-400">{feature}</span>
                      </div>
                    ))}
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
