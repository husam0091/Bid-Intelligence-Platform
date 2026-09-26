'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { makeT, type T } from '@/lib/ui/i18n'
import type { Lang } from '@/lib/ui/model'

type Ctx = { lang: Lang; t: T; setLang: (l: Lang) => void }
const LangContext = createContext<Ctx>({ lang: 'en', t: makeT('en'), setLang: () => {} })

export function LangProvider({ initial, children }: { initial: Lang; children: React.ReactNode }) {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>(initial)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr'
    document.body.classList.toggle('ar', lang === 'ar')
    document.body.classList.toggle('en', lang === 'en')
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    document.cookie = `lang=${l};path=/;max-age=31536000;SameSite=Lax`
    try { localStorage.setItem('blackbid_lang', l) } catch {}
    router.refresh()   // server components re-render with the new cookie
  }, [router])

  const value = useMemo(() => ({ lang, t: makeT(lang), setLang }), [lang, setLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
