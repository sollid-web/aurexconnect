import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'
import Script from 'next/script';
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
          {children}

          {/* Smartsupp Live Chat - Correct Next.js Implementation */}
          <Script id="smartsupp-chat" strategy="afterInteractive">
            {`
              var _smartsupp = _smartsupp || {};
              _smartsupp.key = '441af05abe42eccdc13231764d0ea2936ed074c3';
              window.smartsupp||(function(d) {
                var s,c,o=smartsupp=function(){ o._.push(arguments)};o._=[];
                s=d.getElementsByTagName('script')[0];c=d.createElement('script');
                c.type='text/javascript';c.charset='utf-8';c.async=true;
                c.src='https://www.smartsuppchat.com/loader.js?';s.parentNode.insertBefore(c,s);
              })(document);
            `}
          </Script>

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
