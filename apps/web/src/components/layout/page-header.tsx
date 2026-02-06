'use client'

import { Breadcrumbs } from '@/components/ui/breadcrumbs'

export function PageHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center h-14 px-6 border-b border-border bg-background/95 backdrop-blur-sm">
      <Breadcrumbs />
    </header>
  )
}

