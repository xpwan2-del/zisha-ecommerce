"use client";

import { RegionDropdown } from 'react-country-region-selector';

interface RegionSelectProps {
  country: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export default function RegionSelect({ 
  country, 
  value, 
  onChange, 
  className = '', 
  disabled = false,
  placeholder = '选择地区'
}: RegionSelectProps) {
  return (
    <RegionDropdown
      country={country}
      value={value}
      onChange={onChange}
      className={`w-full px-4 py-2 bg-card border border-border rounded-md text-text 
                  focus:outline-none focus:ring-2 focus:ring-accent transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      disableWhenEmpty={true}
      disabled={disabled || !country}
      blankOptionLabel={placeholder}
      defaultOptionLabel={placeholder}
    />
  );
}
