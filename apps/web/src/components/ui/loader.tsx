import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoaderProps {
  className?: string
}

export function Loader({ className }: LoaderProps) {
  return (
    <div className={cn("inline-flex items-center", className)}>
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
    </div>
  )
}
