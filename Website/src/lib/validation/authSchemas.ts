import { z } from 'zod';

// ============ HELPER FUNCTIONS ============

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizePhone(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If it starts with country code, keep it; otherwise assume India (+91)
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else if (cleaned.length > 10) {
      cleaned = '+' + cleaned;
    }
  }

  return cleaned;
}

// ============ PASSWORD VALIDATION ============

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    passwordRegex,
    'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)'
  );

// ============ COMMON SCHEMAS ============

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .transform(normalizeEmail);

export const phoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .transform(sanitizePhone)
  .refine(
    (phone) => /^\+?[1-9]\d{9,14}$/.test(phone),
    'Invalid phone number format'
  );

// ============ AUTH SCHEMAS ============

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['student', 'owner']).optional()
});

export const studentSignupSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    collegeId: z.string().min(3, 'College ID is required'),
    collegeName: z.string().min(3, 'College name is required')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  });

export const ownerSignupSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  });

// ============ OTP SCHEMAS ============

export const otpSendSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  type: z.enum(['email', 'phone'])
});

export const otpVerifySchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  code: z.string().length(6, 'OTP must be 6 digits'),
  type: z.enum(['email', 'phone'])
});

// ============ TYPE EXPORTS ============

export type LoginInput = z.infer<typeof loginSchema>;
export type StudentSignupInput = z.infer<typeof studentSignupSchema>;
export type OwnerSignupInput = z.infer<typeof ownerSignupSchema>;
export type OTPSendInput = z.infer<typeof otpSendSchema>;
export type OTPVerifyInput = z.infer<typeof otpVerifySchema>;
