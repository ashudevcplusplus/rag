import React from 'react';
import { cn } from '../utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
}

export function Select({
  label,
  hint,
  error,
  options,
  className,
  disabled,
  onChange,
  value,
  ...props
}: SelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={cn(
            'block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10',
            'text-gray-900 text-sm appearance-none cursor-pointer',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          disabled={disabled}
          value={value}
          onChange={handleChange}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      {hint && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

/**
 * Enhanced Select with description support
 * Shows option description below the selected value
 */
export interface SelectWithDescriptionProps extends SelectProps {
  showDescription?: boolean;
}

export function SelectWithDescription({
  label,
  hint,
  error,
  options,
  className,
  disabled,
  onChange,
  value,
  showDescription = true,
  ...props
}: SelectWithDescriptionProps) {
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={cn(
            'block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10',
            'text-gray-900 text-sm appearance-none cursor-pointer',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      {showDescription && selectedOption?.description && (
        <p className="mt-1.5 text-sm text-gray-500">{selectedOption.description}</p>
      )}
      {hint && !error && !selectedOption?.description && (
        <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

