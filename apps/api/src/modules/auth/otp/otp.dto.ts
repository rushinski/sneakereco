import { z } from 'zod';

export const OtpRequestDtoSchema = z.object({
  email: z.string().email(),
});
export type OtpRequestDto = z.infer<typeof OtpRequestDtoSchema>;

export const OtpVerifyDtoSchema = z.object({
  email: z.string().email(),
  session: z.string().min(1),
  code: z.string().length(6),
});
export type OtpVerifyDto = z.infer<typeof OtpVerifyDtoSchema>;
