import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Twitter, 
  Github, 
  Linkedin,
  Mail,
  MapPin
} from 'lucide-react';
import { useScrollTo } from '../lib/useScrollTo';

const footerLinks = {
  Product: [
    { name: 'Features', target: 'features' },
    { name: 'How It Works', target: 'how-it-works' },
    { name: 'Pricing', target: 'pricing' },
    { name: 'Testimonials', target: 'testimonials' },
  ],
  Company: [
    { name: 'Contact', target: 'contact' },
  ],
};

export function Footer() {
  const { scrollTo } = useScrollTo();

  return (
    <footer className="relative pt-20 pb-10 border-t border-white/5">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 xs:px-6 sm:px-8 lg:px-8 relative">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 lg:gap-12 mb-12 lg:mb-16">
          {/* Brand Column */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {/* Logo */}
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center gap-2 mb-6 cursor-pointer"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>
                <span className="text-xl font-bold text-white">NexusAI</span>
              </button>

              <p className="text-slate-400 mb-6 max-w-sm">
                Transform your documents into intelligent insights with our
                AI-powered platform. Built for the future of work.
              </p>

              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-400">
                  <Mail className="w-4 h-4" />
                  <span>hello@nexusai.com</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span>San Francisco, CA</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-4 mt-8">
                <span className="w-10 h-10 rounded-xl glass flex items-center justify-center text-slate-400">
                  <Twitter className="w-5 h-5" />
                </span>
                <span className="w-10 h-10 rounded-xl glass flex items-center justify-center text-slate-400">
                  <Github className="w-5 h-5" />
                </span>
                <span className="w-10 h-10 rounded-xl glass flex items-center justify-center text-slate-400">
                  <Linkedin className="w-5 h-5" />
                </span>
              </div>
            </motion.div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links], index) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
            >
              <h3 className="text-white font-semibold mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <button
                      onClick={() => scrollTo(link.target)}
                      className="text-slate-400 hover:text-white transition-colors text-left"
                    >
                      {link.name}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5">
          <p className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
            © {new Date().getFullYear()} NexusAI. All rights reserved.
          </p>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-xs sm:text-sm text-slate-500 hover:text-white transition-colors py-1"
          >
            Back to top ↑
          </button>
        </div>
      </div>
    </footer>
  );
}
