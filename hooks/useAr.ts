'use client'
import { useState, useEffect } from 'react'

export function useAr(): boolean {
  const [ar, setAr] = useState(false)

  useEffect(() => {
    const check = () => setAr(document.body.classList.contains('ar'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  return ar
}
