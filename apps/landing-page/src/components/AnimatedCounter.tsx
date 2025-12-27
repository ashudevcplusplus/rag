import { useEffect, useState, useRef } from 'react';
import { useInView } from 'framer-motion';

interface AnimatedCounterProps {
  value: string;
  className?: string;
}

export function AnimatedCounter({ value, className = '' }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  
  // Check if value is animatable (starts with a number)
  const isAnimatable = /^[\d.]+/.test(value);
  
  // Initialize with the actual value for non-animatable values to avoid flash
  const [displayValue, setDisplayValue] = useState(isAnimatable ? '0' : value);

  useEffect(() => {
    if (!isInView) return;

    // Parse the value to extract numeric part and suffix
    const match = value.match(/^([\d.]+)(.*)$/);
    if (!match) {
      setDisplayValue(value);
      return;
    }

    const numericValue = parseFloat(match[1]);
    const suffix = match[2];
    const isDecimal = value.includes('.');
    const decimalPlaces = isDecimal ? (match[1].split('.')[1]?.length || 0) : 0;

    const duration = 2000;
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;

      if (step >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        const formattedNumber = isDecimal
          ? current.toFixed(decimalPlaces)
          : Math.floor(current).toString();
        setDisplayValue(formattedNumber + suffix);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <span ref={ref} className={className}>
      {displayValue}
    </span>
  );
}
