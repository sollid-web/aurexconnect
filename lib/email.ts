const BRAND = 'AurexConnect'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aurexconnect.site'

export type EmailMessage = { subject: string; html: string }

function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character))
}

function money(value: number) { return `$${value.toFixed(2)}` }

function layout(title: string, body: string, preheader = '') {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#0a0a14;color:#e5e7eb;font-family:Arial,Helvetica,sans-serif"><span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</span><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a14;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#12121f;border:1px solid #2b2b45;border-radius:16px;overflow:hidden"><tr><td style="padding:28px 32px;border-bottom:1px solid #2b2b45"><div style="font-size:24px;font-weight:800;letter-spacing:-.5px"><span style="color:#c9a84c">Aurex</span><span style="color:#fff">Connect</span></div></td></tr><tr><td style="padding:32px">${body}</td></tr><tr><td style="padding:22px 32px;border-top:1px solid #2b2b45;color:#8b8ba3;font-size:12px;line-height:1.6">© ${new Date().getFullYear()} ${BRAND}. This is an automated message. If you need help, contact support@aurexconnect.site.</td></tr></table></td></tr></table></body></html>`
}

function button(label: string, href: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8cc7a);color:#0a0a14;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">${escapeHtml(label)}</a>`
}

function heading(text: string) { return `<h1 style="color:#fff;font-size:26px;margin:0 0 14px">${text}</h1>` }
function paragraph(text: string) { return `<p style="color:#b8b8c9;line-height:1.7">${text}</p>` }
function panel(content: string) { return `<div style="background:#0a0a14;border:1px solid #2b2b45;border-radius:12px;padding:18px;margin:24px 0;color:#fff;line-height:1.9">${content}</div>` }

export function verificationEmail(name: string, token: string): EmailMessage {
  const url = `${APP_URL}/auth/verify-email?token=${encodeURIComponent(token)}`
  return { subject: 'Verify your AurexConnect email address', html: layout('Verify your email', `${heading(`Welcome to ${BRAND}, ${escapeHtml(name)}`)}${paragraph('Please verify your email address to activate your account and protect your investor profile.')}<p style="margin:28px 0">${button('Verify email address', url)}</p>${paragraph('This link expires in 24 hours. If you did not create this account, you can safely ignore this email.')}`, 'Verify your email to activate your AurexConnect account.') }
}

export function passwordResetEmail(name: string, token: string): EmailMessage {
  const url = `${APP_URL}/auth/reset-password?token=${encodeURIComponent(token)}`
  return { subject: 'Reset your AurexConnect password', html: layout('Reset your password', `${heading('Password reset requested')}${paragraph(`Hi ${escapeHtml(name)}, we received a request to reset your AurexConnect password.`)}<p style="margin:28px 0">${button('Reset password', url)}</p>${paragraph('This link expires in 60 minutes and can only be used once. If you did not request this, no action is required.')}`, 'Reset your AurexConnect password securely.') }
}

export function welcomeEmail(name: string): EmailMessage {
  return { subject: 'Welcome to AurexConnect', html: layout('Welcome to AurexConnect', `${heading('Your account is almost ready')}${paragraph(`Hi ${escapeHtml(name)}, thank you for joining AurexConnect. Verify your email to continue to your investor dashboard.`)}<p style="margin:28px 0">${button('Visit AurexConnect', `${APP_URL}/auth/login`)}</p>`, 'Welcome to AurexConnect. Verify your email to continue.') }
}

export function depositSubmittedEmail(name: string, amount: number, currency: string): EmailMessage {
  return { subject: 'Deposit submitted for review', html: layout('Deposit submitted', `${heading('Deposit received')}${paragraph(`Hi ${escapeHtml(name)}, your deposit request has been submitted for review.`)}${panel(`<strong>Amount:</strong> ${money(amount)}<br><strong>Currency:</strong> ${escapeHtml(currency)}<br><strong>Status:</strong> Pending review`)}${paragraph('We will notify you once the transaction has been reviewed by our operations team.')}`, 'Your deposit request has been submitted for review.') }
}

export function depositApprovedEmail(name: string, amount: number, currency: string): EmailMessage {
  return { subject: 'Your deposit has been approved', html: layout('Deposit approved', `${heading('Funds added to your account')}${paragraph(`Hi ${escapeHtml(name)}, your deposit has been approved and is now available in your AurexConnect balance.`)}${panel(`<strong>Amount credited:</strong> ${money(amount)}<br><strong>Currency:</strong> ${escapeHtml(currency)}<br><strong>Status:</strong> Approved`)}<p style="margin:28px 0">${button('View dashboard', `${APP_URL}/dashboard`)}</p>`, 'Your deposit has been approved and credited.') }
}

export function depositRejectedEmail(name: string, amount: number, reason?: string): EmailMessage {
  return { subject: 'Action required: deposit not approved', html: layout('Deposit not approved', `${heading('Deposit requires attention')}${paragraph(`Hi ${escapeHtml(name)}, your deposit of ${money(amount)} could not be approved at this time.`)}${panel(`<strong>Reason:</strong> ${escapeHtml(reason || 'Please contact support for assistance.')}`)}<p style="margin:28px 0">${button('View transactions', `${APP_URL}/dashboard/transactions`)}</p>`, 'Your deposit requires attention.') }
}

export function withdrawalSubmittedEmail(name: string, amount: number, currency: string): EmailMessage {
  return { subject: 'Withdrawal request received', html: layout('Withdrawal requested', `${heading('Withdrawal request received')}${paragraph(`Hi ${escapeHtml(name)}, your withdrawal request has been received and is being reviewed by our operations team.`)}${panel(`<strong>Amount:</strong> ${money(amount)}<br><strong>Currency:</strong> ${escapeHtml(currency)}<br><strong>Status:</strong> Pending review`)}${paragraph('We will send another email when the request is approved or rejected.')}`, 'Your withdrawal request is under review.') }
}

export function withdrawalApprovedEmail(name: string, amount: number, currency: string): EmailMessage {
  return { subject: 'Your withdrawal has been approved', html: layout('Withdrawal approved', `${heading('Withdrawal approved')}${paragraph(`Hi ${escapeHtml(name)}, your withdrawal has been approved and sent for processing.`)}${panel(`<strong>Amount:</strong> ${money(amount)}<br><strong>Currency:</strong> ${escapeHtml(currency)}<br><strong>Status:</strong> Approved`)}<p style="margin:28px 0">${button('View transactions', `${APP_URL}/dashboard/transactions`)}</p>`, 'Your withdrawal has been approved.') }
}

export function withdrawalRejectedEmail(name: string, amount: number, reason?: string): EmailMessage {
  return { subject: 'Action required: withdrawal rejected', html: layout('Withdrawal rejected', `${heading('Withdrawal request rejected')}${paragraph(`Hi ${escapeHtml(name)}, your withdrawal request for ${money(amount)} was rejected and the held funds have been returned to your balance.`)}${panel(`<strong>Reason:</strong> ${escapeHtml(reason || 'Please contact support for assistance.')}`)}<p style="margin:28px 0">${button('View transactions', `${APP_URL}/dashboard/transactions`)}</p>`, 'Your withdrawal request was rejected.') }
}

export function kycSubmittedEmail(name: string): EmailMessage {
  return { subject: 'KYC documents received', html: layout('KYC submitted', `${heading('Identity verification submitted')}${paragraph(`Hi ${escapeHtml(name)}, your KYC documents have been received and are now under review.`)}${panel('<strong>Review time:</strong> Usually within 24–48 hours<br><strong>Status:</strong> Pending review')}${paragraph('We will email you as soon as the compliance team reaches a decision.')}`, 'Your KYC documents are under review.') }
}

export function kycApprovedEmail(name: string): EmailMessage {
  return { subject: 'Your AurexConnect identity verification is approved', html: layout('KYC approved', `${heading('Identity verified')}${paragraph(`Hi ${escapeHtml(name)}, your identity verification has been approved. Full platform access is now available.`)}<p style="margin:28px 0">${button('Open dashboard', `${APP_URL}/dashboard`)}</p>`, 'Your AurexConnect identity verification is approved.') }
}

export function kycRejectedEmail(name: string, reason?: string): EmailMessage {
  return { subject: 'Action required: KYC verification update', html: layout('KYC update', `${heading('Additional information required')}${paragraph(`Hi ${escapeHtml(name)}, our compliance team could not approve your KYC submission yet.`)}${panel(`<strong>Reason:</strong> ${escapeHtml(reason || 'Please submit clearer or valid documents.')}`)}<p style="margin:28px 0">${button('Review KYC', `${APP_URL}/dashboard/kyc`)}</p>`, 'Your KYC submission requires attention.') }
}

export function dailyRoiEmail(name: string, planName: string, amount: number, totalPaid: number, expectedProfit: number, matured: boolean): EmailMessage {
  const status = matured ? 'Your investment has completed' : 'Daily ROI has been credited'
  return { subject: matured ? `${planName} investment matured` : `Daily ROI credited — ${planName}`, html: layout('ROI update', `${heading(status)}${paragraph(`Hi ${escapeHtml(name)}, your AurexConnect account has received today's investment update.`)}${panel(`<strong>Plan:</strong> ${escapeHtml(planName)}<br><strong>ROI credited today:</strong> ${money(amount)}<br><strong>Total ROI credited:</strong> ${money(totalPaid)}<br><strong>Total plan ROI:</strong> ${money(expectedProfit)}<br><strong>Status:</strong> ${matured ? 'Matured — principal returned' : 'Active — more daily ROI pending'}`)}<p style="margin:28px 0">${button('View portfolio', `${APP_URL}/dashboard`)}</p>`, 'Your daily AurexConnect ROI has been credited.') }
}

export function investmentActivatedEmail(name: string, planName: string, amount: number, expectedProfit: number, durationDays: number): EmailMessage {
  return { subject: `${planName} investment activated`, html: layout('Investment activated', `${heading('Your investment is now active')}${paragraph(`Hi ${escapeHtml(name)}, your investment has been activated and daily ROI processing will begin according to the plan schedule.`)}${panel(`<strong>Plan:</strong> ${escapeHtml(planName)}<br><strong>Amount:</strong> ${money(amount)}<br><strong>Total expected ROI:</strong> ${money(expectedProfit)}<br><strong>Duration:</strong> ${durationDays} days`)}<p style="margin:28px 0">${button('View investment', `${APP_URL}/dashboard/plans`)}</p>`, 'Your investment has been activated.') }
}

export function balanceAdjustmentEmail(name: string, amount: number, direction: 'credited' | 'debited', note?: string): EmailMessage {
  return { subject: `Account balance ${direction}`, html: layout('Balance update', `${heading('Your balance was updated')}${paragraph(`Hi ${escapeHtml(name)}, ${money(amount)} was ${direction} ${note ? `to your account with the note: ${escapeHtml(note)}` : 'to your AurexConnect account'}.`)}<p style="margin:28px 0">${button('View dashboard', `${APP_URL}/dashboard`)}</p>`, 'Your AurexConnect balance was updated.') }
}

export function referralBonusEmail(name: string, amount: number): EmailMessage {
  return { subject: 'Referral bonus credited', html: layout('Referral bonus', `${heading('You earned a referral bonus')}${paragraph(`Hi ${escapeHtml(name)}, a referral bonus has been credited to your AurexConnect balance.`)}${panel(`<strong>Bonus credited:</strong> ${money(amount)}<br><strong>Status:</strong> Completed`)}<p style="margin:28px 0">${button('View dashboard', `${APP_URL}/dashboard`)}</p>`, 'Your referral bonus has been credited.') }
}

const CAMPAIGN_SUBJECTS = ['AurexConnect portfolio check-in', 'Your AurexConnect account update', 'A note from the AurexConnect team', 'Keep your investment goals on track']
const CAMPAIGN_BODIES = [
  (name: string) => `${heading('Keep your goals moving')}${paragraph(`Hi ${escapeHtml(name)}, take a moment to review your current portfolio and recent account activity. Your dashboard has the latest balance, investment, and ROI information.`)}<p style="margin:28px 0">${button('Review portfolio', `${APP_URL}/dashboard`)}</p>`,
  (name: string) => `${heading('Your account is ready when you are')}${paragraph(`Hi ${escapeHtml(name)}, AurexConnect is here to help you stay informed. Review your active plans, recent transactions, and account notifications in one place.`)}<p style="margin:28px 0">${button('Open dashboard', `${APP_URL}/dashboard`)}</p>`,
  (name: string) => `${heading('A quick account reminder')}${paragraph(`Hi ${escapeHtml(name)}, please keep your profile and verification details up to date so your account can continue operating smoothly.`)}<p style="margin:28px 0">${button('Review account', `${APP_URL}/dashboard`)}</p>`,
  (name: string) => `${heading('Stay close to your portfolio')}${paragraph(`Hi ${escapeHtml(name)}, your AurexConnect dashboard is the best place to follow daily ROI credits, investment progress, and account activity.`)}<p style="margin:28px 0">${button('View account activity', `${APP_URL}/dashboard/transactions`)}</p>`,
]

export function randomizedCampaignEmail(name: string): EmailMessage {
  const index = Math.floor(Math.random() * CAMPAIGN_BODIES.length)
  return { subject: CAMPAIGN_SUBJECTS[index], html: layout('Account update', CAMPAIGN_BODIES[index](name), 'A new account update from AurexConnect.') }
}

export function customAdminEmail(subject: string, message: string): EmailMessage {
  const safeSubject = escapeHtml(subject)
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>')
  return { subject, html: layout(subject, `${heading(safeSubject)}${paragraph(safeMessage)}<p style="margin:28px 0">${button('Open AurexConnect', APP_URL)}</p>`, subject) }
}

export async function sendEmail(to: string, email: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY is not configured; email was not sent')
    return { sent: false }
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL || 'AurexConnect <noreply@aurexconnect.site>', to: [to], subject: email.subject, html: email.html }),
  })
  if (!response.ok) {
    const detail = await response.text()
    console.error('[email] Resend failed:', response.status, detail)
    throw new Error('Email delivery failed')
  }
  return { sent: true }
}
