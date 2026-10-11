import { prisma } from '@/lib/prisma'

export const DEFAULT_SETTINGS: Record<string, { value: string; valueType: string }> = {
  maintenance_mode: { value: 'false', valueType: 'boolean' },
  registration_enabled: { value: 'true', valueType: 'boolean' },
  kyc_required_for_withdrawal: { value: 'true', valueType: 'boolean' },
  public_activity_enabled: { value: 'true', valueType: 'boolean' },
  public_activity_preview_mode: { value: 'true', valueType: 'boolean' },
  withdrawals_enabled: { value: 'true', valueType: 'boolean' },
  roi_enabled: { value: 'true', valueType: 'boolean' },
  roi_email_enabled: { value: 'true', valueType: 'boolean' },
  support_email: { value: 'support@aurexconnect.site', valueType: 'string' },
  site_name: { value: 'AurexConnect', valueType: 'string' },
  withdrawal_minimum: { value: '10', valueType: 'number' },
  withdrawal_maximum: { value: '0', valueType: 'number' },
  withdrawal_fee_percent: { value: '0', valueType: 'number' },
  maintenance_message: { value: 'We are performing scheduled maintenance. Please check back shortly.', valueType: 'string' },
}

export function parseSetting(value: string, type: string): string | boolean | number {
  if (type === 'boolean') return value === 'true'
  if (type === 'number') return Number(value)
  return value
}

export async function getSettings() {
  const rows = await prisma.siteSetting.findMany()
  const settings: Record<string, string | boolean | number> = {}
  for (const [key, fallback] of Object.entries(DEFAULT_SETTINGS)) settings[key] = parseSetting(fallback.value, fallback.valueType)
  for (const row of rows) settings[row.key] = parseSetting(row.value, row.valueType)
  return settings
}

export async function isSettingEnabled(key: string, fallback = true) {
  const setting = await prisma.siteSetting.findUnique({ where: { key }, select: { value: true, valueType: true } })
  return setting ? Boolean(parseSetting(setting.value, setting.valueType)) : fallback
}
