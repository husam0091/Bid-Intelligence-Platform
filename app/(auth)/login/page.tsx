'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
export default function LoginPage() {
  const router = useRouter()
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [lang,    setLang]    = useState<'en' | 'ar'>('en')
  const ar = lang === 'ar'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form   = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email:    form.get('email'),
      password: form.get('password'),
      redirect: false,
    })
    if (result?.error) {
      setError(ar ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  function toggleLang() {
    const next = ar ? 'en' : 'ar'
    setLang(next)
    document.documentElement.setAttribute('lang', next)
    document.body.classList.toggle('ar', next === 'ar')
  }

  return (
    <div className="login-root" dir={ar ? 'rtl' : 'ltr'}>
      <div className="login-card">

        {/* Brand */}
        <div className="login-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fulllogo_transparent_nobuffer.png" alt="Black Construction" className="login-logo" />
          <div className="login-brand-sub">Bid Intelligence Platform</div>
        </div>

        <div className="login-divider" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {error && <div className="login-error">{error}</div>}

          <label className="field-label">
            {ar ? 'البريد الإلكتروني' : 'Email'}
            <input
              name="email"
              type="email"
              className="field"
              placeholder="admin@black.sa"
              autoComplete="email"
              required
              dir="ltr"
            />
          </label>

          <label className="field-label">
            {ar ? 'كلمة المرور' : 'Password'}
            <input
              name="password"
              type="password"
              className="field"
              autoComplete="current-password"
              required
              dir="ltr"
            />
          </label>

          <button
            type="submit"
            className="btn btn--primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}
          >
            {loading
              ? (ar ? 'جاري التحقق...' : 'Signing in…')
              : (ar ? 'تسجيل الدخول'   : 'Sign In')}
          </button>
        </form>

        {/* Language */}
        <div className="login-lang">
          <button className={!ar ? 'active' : ''} onClick={() => ar && toggleLang()} type="button">EN</button>
          <button className={ar  ? 'active' : ''} onClick={() => !ar && toggleLang()} type="button">AR</button>
        </div>

      </div>
    </div>
  )
}
