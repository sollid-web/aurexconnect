import { z } from 'zod'

const positivePage = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100_000))
const userLimit = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(50))

export const transactionListQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'ALL']).default('PENDING'),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'PROFIT', 'REFERRAL_BONUS']).optional(),
  page: positivePage.optional().default('1'),
}).strict()

export const kycListQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALL']).default('PENDING'),
  page: positivePage.optional().default('1'),
}).strict()

export const userListQuerySchema = z.object({
  page: positivePage.optional().default('1'),
  limit: userLimit.optional().default('20'),
  search: z.string().max(120).optional().default(''),
}).strict()
