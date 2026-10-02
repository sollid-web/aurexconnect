import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'
import CommunityActivityTicker from '@/components/home/CommunityActivityTicker'
import IntercomMessenger from '@/components/IntercomMessenger'

const inter = localFont({
  src: './fonts/Inter-Variable.ttf',
  variable: '--font-inter',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <CommunityActivityTicker />
          <IntercomMessenger />
          {children}

          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1a2e',
                color: '#fff',
                border: '1px solid #c9a84c',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
