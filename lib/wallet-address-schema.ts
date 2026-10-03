import { z } from 'zod'

const currency = z.string().trim().min(2).max(20).transform(value => value.toUpperCase()).refine(value => /^[A-Z0-9][A-Z0-9_-]*$/.test(value), 'Use letters, numbers, hyphens, or underscores for the payment-method code')
const label = z.string().trim().min(2).max(80)
const address = z.string().trim().min(8).max(300)
const network = z.string().trim().min(2).max(64)

export const walletAddressCreateSchema = z.object({
  currency,
  label,
  address,
  network,
  isActive: z.boolean().default(true),
}).strict()

export const walletAddressUpdateSchema = z.object({
  id: z.string().min(1).max(128),
  currency: currency.optional(),
  label: label.optional(),
  address: address.optional(),
  network: network.optional(),
  isActive: z.boolean().optional(),
}).strict().refine(input => Object.keys(input).some(key => key !== 'id'), 'Provide at least one field to update')
