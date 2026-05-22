import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title:       'Black — Bid Intelligence',
  description: 'Bid decision engine for Saudi construction contractors',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
