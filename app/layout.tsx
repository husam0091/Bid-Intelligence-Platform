import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import '@/styles/fonts.css'
import '@/styles/globals.css'
import '@/styles/prototype.css'

export const metadata: Metadata = {
  title:       'Black Construction — Bid Intelligence',
  description: 'Bid decision engine for Saudi construction contractors',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ar = (await cookies()).get('lang')?.value === 'ar'
  return (
    <html lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <body className={ar ? 'ar' : 'en'}>{children}</body>
    </html>
  )
}
