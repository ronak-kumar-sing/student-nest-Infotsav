'use client';

import * as React from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrength?: boolean;
}

// Password strength checker
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  // Calculate score
  if (checks.length) score += 20;
  if (checks.lowercase) score += 20;
  if (checks.uppercase) score += 20;
  if (checks.number) score += 20;
  if (checks.special) score += 20;

  // Determine label and color
  if (score < 40) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score < 60) return { score, label: 'Fair', color: 'bg-orange-500' };
  if (score < 80) return { score, label: 'Good', color: 'bg-yellow-500' };
  if (score < 100) return { score, label: 'Strong', color: 'bg-green-500' };
  return { score, label: 'Very Strong', color: 'bg-green-600' };
};

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrength = false, onChange, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const [password, setPassword] = useState('');
    const strength = showStrength ? getPasswordStrength(password) : null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            className={className}
            ref={ref}
            {...props}
            onChange={handleChange}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-1 top-1 h-8 w-8 hover:bg-transparent"
            onClick={() => setShow((s) => !s)}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        {showStrength && password && strength && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Password Strength:</span>
              <span className={`font-medium ${strength.score < 40 ? 'text-red-600' :
                  strength.score < 60 ? 'text-orange-600' :
                    strength.score < 80 ? 'text-yellow-600' :
                      'text-green-600'
                }`}>
                {strength.label}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${strength.color}`}
                style={{ width: `${strength.score}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Must contain: uppercase, lowercase, number, and special character (@$!%*?&)
            </p>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
