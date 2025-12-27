import { motion } from 'framer-motion';
import { Twitter, Github, Linkedin } from 'lucide-react';
import { useScrollTo } from '../lib/useScrollTo';
import { Logo } from '../components/Logo';

const footerLinks = {
  Product: [
    { name: 'Features', target: 'features' },
    { name: 'How It Works', target: 'how-it-works' },
    { name: 'Pricing', target: 'pricing' },
  ],
  Company: [
    { name: 'About', target: 'features' },
    { name: 'Contact', target: 'contact' },
  ],
};

const socialLinks = [
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Github, label: 'GitHub', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
];

export function Footer() {
  const { scrollTo } = useScrollTo();

  return (
    <footer className="relative pt-16 pb-8 border-t border-white/[0.05]">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="mb-4"
              >
                <Logo size="md" />
              </button>
              <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-xs">
                Build AI chatbots with complete flexibility. Your LLM, your embeddings, your rules.
              </p>
              
              {/* Social Links */}
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-slate-400 hover:text-white hover:border-white/[0.1] hover:bg-white/[0.05] transition-all"
                    aria-label={social.label}
                  >
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links], index) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
            >
              <h3 className="text-sm font-medium text-white mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <button
                      onClick={() => scrollTo(link.target)}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}

          {/* Newsletter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="text-sm font-medium text-white mb-4">Stay Updated</h3>
            <p className="text-sm text-slate-400 mb-4">
              Get the latest updates and news.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email"
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-white/[0.03] border border-white/[0.06] text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50 transition-colors"
              />
              <button className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-400 transition-colors">
                Join
              </button>
            </div>
          </motion.div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/[0.05]">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Oprag.ai. All rights reserved.
          </p>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-xs text-slate-500 hover:text-white transition-colors"
          >
            Back to top ↑
          </button>
        </div>
      </div>
    </footer>
  );
}
