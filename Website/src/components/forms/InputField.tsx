'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import * as React from 'react';

export interface InputFieldProps extends React.ComponentProps<'input'> {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  icon?: LucideIcon;
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ id, label, error, className, required, icon: Icon, ...props }, ref) => {
    const describedBy = error ? `${id}-error` : undefined;

    return (
      <div className={cn('space-y-2', className)}>
        <Label htmlFor={id} className="font-medium">
          {label}
          {required ? <span aria-hidden="true" className="text-red-600 ml-1">*</span> : null}
        </Label>
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon className="h-4 w-4 text-gray-400" />
            </div>
          )}
          <Input
            id={id}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              error && 'border-red-500',
              Icon && 'pl-10'
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);

InputField.displayName = 'InputField';
