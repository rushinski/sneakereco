import { z } from 'zod';

export const SubscribeDtoSchema = z.object({
  email: z.string().trim().email(),
});

export type SubscribeDto = z.infer<typeof SubscribeDtoSchema>;
