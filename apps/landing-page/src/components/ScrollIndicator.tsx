import { motion } from 'framer-motion';

export function ScrollIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2"
    >
      <span className="text-xs text-slate-500 uppercase tracking-widest">Scroll</span>
      <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-1.5 h-1.5 rounded-full bg-primary-400"
        />
      </div>
    </motion.div>
  );
}
