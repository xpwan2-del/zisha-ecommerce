"use client";

import { CountryDropdown } from 'react-country-region-selector';

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function CountrySelect({ value, onChange, className = '', disabled = false }: CountrySelectProps) {
  return (
    <CountryDropdown
      value={value}
      onChange={onChange}
      className={`w-full px-4 py-2 bg-card border border-border rounded-md text-text
                  focus:outline-none focus:ring-2 focus:ring-accent transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      priorityOptions={['AE', 'SA', 'US', 'CN', 'GB', 'IN', 'DE', 'FR', 'JP', 'SG']}
      showDefaultOption={true}
      defaultOptionLabel="选择国家"
      disabled={disabled}
    />
  );
}
