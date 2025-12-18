import React, { useId, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  uiSize?: 'sm' | 'md';
}

const sizeClasses: Record<NonNullable<SelectProps['uiSize']>, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, leftIcon, uiSize = 'md', id, children, ...props }, ref) => {
    const reactId = useId();
    const selectId = id ?? `select-${reactId}`;
    const hintId = useMemo(() => (hint ? `${selectId}-hint` : undefined), [hint, selectId]);
    const errorId = useMemo(() => (error ? `${selectId}-error` : undefined), [error, selectId]);
    const describedBy = useMemo(() => {
      const ids = [errorId, hintId].filter(Boolean);
      return ids.length > 0 ? ids.join(' ') : undefined;
    }, [errorId, hintId]);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}

          <select
            id={selectId}
            ref={ref}
            className={cn(
              'block w-full appearance-none rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400',
              'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              'transition-colors duration-200',
              sizeClasses[uiSize],
              leftIcon && 'pl-10',
              // extra right padding for chevron
              'pr-10',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-errormessage={errorId}
            {...props}
          >
            {children}
          </select>

          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>

        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1 text-sm text-gray-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

