import type { Metadata } from 'next'
import { Archivo_Narrow, Inter_Tight, JetBrains_Mono, IBM_Plex_Sans_Arabic } from 'next/font/google'
import '@/styles/globals.css'

const archivoNarrow = Archivo_Narrow({
  subsets: ['latin'],
  weight:  ['400', '600', '700'],
  display: 'swap',
  variable: '--font-archivo-narrow',
})

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight:  ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-inter-tight',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight:  ['400', '500'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight:  ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-ibm-plex-arabic',
})

export const metadata: Metadata = {
  title:       'Black — Bid Intelligence',
  description: 'Bid decision engine for Saudi construction contractors',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = [archivoNarrow.variable, interTight.variable, jetbrainsMono.variable, ibmPlexArabic.variable].join(' ')
  return (
    <html lang="en" className={fontVars}>
      <body>{children}</body>
    </html>
  )
}
