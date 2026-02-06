import React from 'react'

// Simple layout for legacy /app route - no AppLayout to avoid locale dependencies
export default function AppLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
