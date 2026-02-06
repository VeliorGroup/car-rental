'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const params = useParams()
  const locale = params.locale as string || 'en'
  const t = useTranslations('Navigation')

  // Parse pathname into breadcrumb items
  const pathSegments = pathname
    .replace(`/${locale}`, '')
    .split('/')
    .filter(Boolean)

  const breadcrumbs: BreadcrumbItem[] = pathSegments.map((segment, index) => {
    const href = `/${locale}/${pathSegments.slice(0, index + 1).join('/')}`
    
    // Try to translate the segment, fallback to formatted segment
    let label = segment
    try {
      const translated = t(segment)
      if (translated && !translated.includes('.')) {
        label = translated
      } else {
        // Format segment: replace hyphens, capitalize
        label = segment
          .replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
      }
    } catch {
      label = segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
    }

    // Check if this is a UUID (detail page)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
    if (isUuid) {
      label = 'Details'
    }

    return { label, href }
  })

  if (breadcrumbs.length === 0) return null

  return (
    <nav className="flex items-center text-sm text-muted-foreground">
      <Link 
        href={`/${locale}/dashboard`}
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-2" />
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : (
            <Link 
              href={item.href || '#'}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
