import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatsCard({ 
  title, 
  value, 
  description, 
  icon,
  trend,
  className 
}: StatsCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border bg-card p-5 transition-colors hover:border-primary/20",
      className
    )}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
      
      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {trend && (
          <span className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded",
            trend.isPositive 
              ? "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30"
              : "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30"
          )}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
