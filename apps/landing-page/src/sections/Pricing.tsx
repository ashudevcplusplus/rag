import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useScrollTo } from '../lib/useScrollTo';

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for small teams',
    price: 49,
    features: [
      '5,000 documents/month',
      'Basic semantic search',
      'Email support',
      '5 team members',
      'API access',
    ],
  },
  {
    name: 'Professional',
    description: 'For growing teams',
    price: 149,
    popular: true,
    features: [
      '50,000 documents/month',
      'Advanced AI analysis',
      'Priority support',
      'Unlimited team members',
      'Custom integrations',
      'Analytics dashboard',
      'Custom workflows',
    ],
  },
  {
    name: 'Enterprise',
    description: 'For large organizations',
    price: null,
    features: [
      'Unlimited documents',
      'Custom AI models',
      'Dedicated support',
      'SSO & SCIM',
      'On-premise option',
      'SLA guarantee',
      'Custom training',
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
            <span className="text-white">Simple, transparent </span>
            <span className="gradient-text">pricing</span>
          </h2>
          <p className="max-w-xl mx-auto text-lg text-slate-400 mb-8">
            Start free for 14 days. No credit card required.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={cn(
              "text-sm transition-colors",
              !isYearly ? "text-white" : "text-slate-500"
            )}>
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-12 h-6 rounded-full bg-white/10 border border-white/10 transition-colors hover:border-white/20"
              aria-label={isYearly ? "Switch to monthly" : "Switch to yearly"}
            >
              <motion.div
                animate={{ x: isYearly ? 24 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 w-4 h-4 rounded-full bg-primary-500"
              />
            </button>
            <span className={cn(
              "text-sm transition-colors flex items-center gap-2",
              isYearly ? "text-white" : "text-slate-500"
            )}>
              Yearly
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
                -20%
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
              className={cn(
                'relative group',
                plan.popular && 'md:-translate-y-4'
              )}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="px-4 py-1 rounded-full bg-primary-500 text-white text-xs font-medium">
                    Most Popular
                  </div>
                </div>
              )}

              <div
                className={cn(
                  'relative h-full rounded-2xl transition-all duration-500',
                  plan.popular
                    ? 'bg-gradient-to-b from-primary-500/10 to-transparent border border-primary-500/20'
                    : 'bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.08]'
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
                    ) : (
                      <div className="text-4xl font-bold text-white">Custom</div>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => scrollTo('contact')}
                    className={cn(
                      'w-full py-3 rounded-xl font-medium transition-all duration-300',
                      plan.popular
                        ? 'bg-primary-500 text-white hover:bg-primary-400'
                        : 'bg-white/[0.05] text-white border border-white/[0.08] hover:bg-white/[0.08]'
                    )}
                  >
                    {plan.price !== null ? 'Get Started' : 'Contact Sales'}
                  </button>

                  {/* Features */}
                  <div className="mt-8 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500/10 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-primary-400" />
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
