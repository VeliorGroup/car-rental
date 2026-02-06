'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function SuperAdminPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  useEffect(() => {
    const token = localStorage.getItem('superadmin_token')
    if (token) {
      router.push(`/${locale}/superadmin/dashboard`)
    } else {
      router.push(`/${locale}/superadmin/login`)
    }
  }, [router, locale])

  return null
}
