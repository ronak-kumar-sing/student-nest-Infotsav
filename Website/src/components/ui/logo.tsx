import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  iconClassName?: string;
  textClassName?: string;
}

export function StudentNestLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-8 h-8', className)}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />
      <path
        d="M16 8L22 12V20L16 24L10 20V12L16 8Z"
        fill="white"
        fillOpacity="0.9"
      />
      <circle cx="16" cy="16" r="3" fill="url(#logo-gradient)" />
    </svg>
  );
}

export function StudentNestLogo({ className, showText = true, iconClassName, textClassName }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <StudentNestLogoIcon className={iconClassName} />
      {showText && (
        <span className={cn('text-xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] bg-clip-text text-transparent', textClassName)}>
          StudentNest
        </span>
      )}
    </div>
  );
}
