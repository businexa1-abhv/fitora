import { z } from 'zod';

export const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^(\+91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
});

export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit OTP'),
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  dateOfBirth: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Use YYYY-MM-DD'),
  city: z.string().trim().min(2, 'City is required').max(100),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL']).optional(),
  agreeTerms: z.boolean().refine((v) => v === true, 'Please accept Terms & Privacy'),
});

export type PhoneForm = z.infer<typeof phoneSchema>;
export type OtpForm = z.infer<typeof otpSchema>;
export type ProfileForm = z.infer<typeof profileSchema>;
