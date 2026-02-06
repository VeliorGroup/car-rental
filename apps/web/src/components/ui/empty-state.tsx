import { cn } from '@/lib/utils'
import { LucideIcon, FileQuestion, Search, Plus, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
  variant?: 'default' | 'search' | 'error'
}

export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  className,
  variant = 'default'
}: EmptyStateProps) {
  const variantIcon = {
    default: Icon,
    search: Search,
    error: AlertCircle
  }
  
  const FinalIcon = variantIcon[variant] || Icon

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      <div className={cn(
        "flex items-center justify-center w-16 h-16 rounded-2xl mb-4",
        variant === 'error' 
          ? "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400"
          : "bg-muted text-muted-foreground"
      )}>
        <FinalIcon className="w-8 h-8" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          {action.label}
        </Button>
      )}
    </div>
  )
}
