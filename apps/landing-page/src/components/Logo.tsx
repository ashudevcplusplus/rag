import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  animated?: boolean;
}

export function Logo({ size = 'md', showText = true, className, animated = true }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-7 h-7', text: 'text-base', letterSize: 'text-sm' },
    md: { icon: 'w-9 h-9', text: 'text-lg', letterSize: 'text-base' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl', letterSize: 'text-lg' },
  };

  const IconWrapper = animated ? motion.div : 'div';
  const iconProps = animated ? {
    whileHover: { rotate: [0, -5, 5, 0] },
    transition: { duration: 0.4 }
  } : {};

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <IconWrapper
        {...iconProps}
        className={cn(
          sizes[size].icon,
          'relative rounded-xl bg-gradient-to-br from-primary-500 via-primary-400 to-accent-500 flex items-center justify-center overflow-hidden'
        )}
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent" />
        
        {/* Logo letter "O" stylized */}
        <svg
          viewBox="0 0 24 24"
          className={cn(sizes[size].letterSize, 'w-5 h-5 text-white relative z-10')}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Stylized "O" with a spark/dot inside representing AI */}
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          {/* Small rays representing intelligence */}
          <path d="M12 6v2" strokeWidth="2" />
          <path d="M12 16v2" strokeWidth="2" />
          <path d="M6 12h2" strokeWidth="2" />
          <path d="M16 12h2" strokeWidth="2" />
        </svg>
      </IconWrapper>

      {showText && (
        <span className={cn(
          sizes[size].text,
          'font-semibold tracking-tight'
        )}>
          <span className="text-white">Oprag</span>
          <span className="text-primary-400">.ai</span>
        </span>
      )}
    </div>
  );
}

// Alternative minimal logo mark
export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn(
      'w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center',
      className
    )}>
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}
