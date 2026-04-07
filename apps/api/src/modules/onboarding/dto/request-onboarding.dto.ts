import { z } from 'zod';

export const RequestOnboardingDtoSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phoneNumber: z.string().trim().min(7),
  businessName: z.string().trim().min(1),
  instagramHandle: z.string().trim().min(1),
});

export type RequestOnboardingDto = z.infer<typeof RequestOnboardingDtoSchema>;
