'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AppRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect legacy /app route to /en/dashboard (with default locale)
    router.replace('/en/dashboard')
  }, [router])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Redirecting...</p>
    </div>
  )
}
