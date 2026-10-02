'use client'

import Intercom, { shutdown, show } from '@intercom/messenger-js-sdk'
import { useSession } from 'next-auth/react'
import { Mail, MessageCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const INTERCOM_APP_ID = 'jv6m7ylw'

export default function IntercomMessenger() {
  const { data: session, status } = useSession()
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [isSupportOpen, setIsSupportOpen] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)')
    const updateViewport = () => setIsMobile(mediaQuery.matches)
    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)
    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    if (status === 'loading' || isMobile === null) return

    const user = session?.user
    const createdAt = user ? Number(user.createdAt) : 0
    const identity = user
      ? {
          user_id: user.id,
          name: user.name,
          email: user.email,
          ...(Number.isFinite(createdAt) && createdAt > 0 ? { created_at: createdAt } : {}),
        }
      : {}

    Intercom({
      app_id: INTERCOM_APP_ID,
      hide_default_launcher: isMobile,
      ...identity,
    })

    return () => shutdown()
  }, [isMobile, session, status])

  if (isMobile !== true || status === 'loading') return null

  const openLiveChat = () => {
    setIsSupportOpen(false)
    show()
  }

  return (
    <div className="fixed right-4 bottom-4 z-[2147483001] flex flex-col items-end gap-3 sm:hidden">
      {isSupportOpen && (
        <div
          role="dialog"
          aria-label="AurexConnect support"
          className="w-[min(320px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-[#c9a84c]/35 bg-[#12121f]/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-white">AurexConnect support</p>
              <p className="mt-0.5 text-[11px] text-gray-400">We’re here to help</p>
            </div>
            <button
              type="button"
              aria-label="Close support panel"
              onClick={() => setIsSupportOpen(false)}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>

          <div className="space-y-2 p-3">
            <button
              type="button"
              onClick={openLiveChat}
              className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] px-3 py-3 text-left text-[#0a0a14] transition-transform active:scale-[0.98]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/10">
                <MessageCircle size={18} />
              </span>
              <span>
                <span className="block text-sm font-bold">Open live chat</span>
                <span className="block text-[11px] opacity-70">Continue in Intercom Messenger</span>
              </span>
            </button>

            <a
              href="mailto:support@aurexconnect.site"
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-white transition-colors hover:bg-white/10"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-[#e8cc7a]">
                <Mail size={17} />
              </span>
              <span>
                <span className="block text-sm font-semibold">Email support</span>
                <span className="block text-[11px] text-gray-400">support@aurexconnect.site</span>
              </span>
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label={isSupportOpen ? 'Close support options' : 'Open support options'}
        aria-expanded={isSupportOpen}
        onClick={() => setIsSupportOpen(open => !open)}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e8cc7a]/50 bg-gradient-to-br from-[#c9a84c] to-[#e8cc7a] text-[#0a0a14] shadow-lg shadow-black/30 transition-transform hover:scale-105 active:scale-95"
      >
        {isSupportOpen ? <X size={21} /> : <MessageCircle size={21} />}
      </button>
    </div>
  )
}
