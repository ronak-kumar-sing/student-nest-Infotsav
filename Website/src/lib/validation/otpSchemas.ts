import { z } from 'zod';
import { emailSchema, phoneSchema } from './authSchemas';

// Send OTP schemas
export const sendEmailOTPSchema = z.object({
  value: emailSchema,
  purpose: z.enum(['signup', 'login', 'reset-password']).optional().default('signup')
});

export const sendPhoneOTPSchema = z.object({
  value: phoneSchema,
  purpose: z.enum(['signup', 'login', 'reset-password']).optional().default('signup')
});

// Verify OTP schemas
export const verifyEmailOTPSchema = z.object({
  value: emailSchema,
  code: z.string().length(6, 'OTP must be 6 digits')
});

export const verifyPhoneOTPSchema = z.object({
  value: phoneSchema,
  code: z.string().length(6, 'OTP must be 6 digits')
});

export type SendEmailOTPInput = z.infer<typeof sendEmailOTPSchema>;
export type SendPhoneOTPInput = z.infer<typeof sendPhoneOTPSchema>;
export type VerifyEmailOTPInput = z.infer<typeof verifyEmailOTPSchema>;
export type VerifyPhoneOTPInput = z.infer<typeof verifyPhoneOTPSchema>;
