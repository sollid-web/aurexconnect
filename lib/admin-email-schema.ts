import { z } from 'zod'

export const adminEmailSchema = z.object({
  audience: z.enum(['all', 'selected']),
  userIds: z.array(z.string()).max(500).default([]),
  template: z.enum(['random', 'custom']).default('random'),
  subject: z.string().trim().min(3).max(160).optional(),
  message: z.string().trim().min(10).max(5000).optional(),
})
