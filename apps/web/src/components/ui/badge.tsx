import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        // Default - Gray with good contrast
        default:
          "border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100",
        secondary:
          "border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100",
        outline: 
          "border-slate-400 bg-transparent text-slate-700 dark:border-slate-500 dark:text-slate-200",
        
        // SUCCESS - Bright green, very visible
        success:
          "border-emerald-400 bg-emerald-500 text-white dark:border-emerald-500 dark:bg-emerald-600 dark:text-white",
        
        // DANGER/DESTRUCTIVE - Bright red, very visible
        danger:
          "border-red-400 bg-red-500 text-white dark:border-red-500 dark:bg-red-600 dark:text-white",
        destructive:
          "border-red-400 bg-red-500 text-white dark:border-red-500 dark:bg-red-600 dark:text-white",
        
        // Others - All gray with good visibility
        info:
          "border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100",
        warning:
          "border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100",
        neutral:
          "border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100",
        active:
          "border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100",
        pending:
          "border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100",
        busy:
          "border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
