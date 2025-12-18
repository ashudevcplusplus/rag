import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { useScrollTo } from '../lib/useScrollTo';

const navLinks = [
  { name: 'Features', target: 'features' },
  { name: 'How It Works', target: 'how-it-works' },
  { name: 'Testimonials', target: 'testimonials' },
  { name: 'Pricing', target: 'pricing' },
  { name: 'Contact', target: 'contact' },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollTo } = useScrollTo();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          isScrolled ? 'py-4' : 'py-6'
        )}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
          <div
            className={cn(
              'flex items-center justify-between transition-all duration-500 rounded-2xl',
              isScrolled 
                ? 'bg-slate-950/80 backdrop-blur-xl border border-white/[0.05] px-6 py-3' 
                : ''
            )}
          >
            {/* Logo */}
            <motion.button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
              <span className="text-lg font-semibold text-white">
                NexusAI
              </span>
            </motion.button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => scrollTo(link.target)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors duration-300 rounded-lg hover:bg-white/[0.03]"
                >
                  {link.name}
                </button>
              ))}
            </div>

            {/* CTA Button */}
            <div className="hidden md:flex items-center">
              <button 
                onClick={() => scrollTo('pricing')} 
                className="px-5 py-2.5 text-sm font-medium text-white bg-white/[0.05] border border-white/[0.08] rounded-full hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-300"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-30 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-0 top-20 z-40 md:hidden"
            >
              <div className="mx-4 bg-slate-900/95 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.05]">
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <button
                      key={link.name}
                      onClick={() => {
                        scrollTo(link.target);
                        setIsMobileMenuOpen(false);
                      }}
                      className="px-4 py-3 text-slate-300 hover:text-white hover:bg-white/[0.03] rounded-xl transition-colors text-left"
                    >
                      {link.name}
                    </button>
                  ))}
                </nav>
                <div className="mt-4 pt-4 border-t border-white/[0.05]">
                  <button 
                    onClick={() => {
                      scrollTo('pricing');
                      setIsMobileMenuOpen(false);
                    }}
                    className="btn-primary w-full"
                  >
                    <span className="relative z-10">Get Started</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
