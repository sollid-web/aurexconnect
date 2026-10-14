import type { Metadata } from 'next'
import localFont from 'next/font/local'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'
import CommunityActivityTicker from '@/components/home/CommunityActivityTicker'

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
          <Script id="tawk-to" strategy="afterInteractive">
            {`
              var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
              (function () {
                var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
                s1.async = true;
                s1.src = 'https://embed.tawk.to/6acff06933c83b34cb12e240/1k4u467kh';
                s1.charset = 'UTF-8';
                s1.setAttribute('crossorigin', '*');
                s0.parentNode.insertBefore(s1, s0);
              })();
            `}
          </Script>
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
