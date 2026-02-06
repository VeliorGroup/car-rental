'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'

export default function HealthPage() {
  const [status, setStatus] = useState('Checking...')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/vehicles?limit=1')
      .then(() => setStatus('Connected'))
      .catch((err) => {
        setStatus('Error')
        setError(err.message + (err.response ? ` - ${err.response.status}` : ''))
      })
  }, [])

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">API Health Check</h1>
      <p className="text-xl mt-4">Status: <span className={status === 'Connected' ? 'text-green-600' : 'text-red-600'}>{status}</span></p>
      {error && <p className="text-red-500 mt-2">{typeof error === 'string' ? error : JSON.stringify(error)}</p>}
    </div>
  )
}
