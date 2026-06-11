import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'error'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
      variant === 'default' && 'bg-zinc-100 text-zinc-800',
      variant === 'outline' && 'border border-zinc-300 text-zinc-600',
      variant === 'success' && 'bg-green-100 text-green-800',
      variant === 'warning' && 'bg-yellow-100 text-yellow-800',
      variant === 'error' && 'bg-red-100 text-red-800',
      className
    )}>
      {children}
    </span>
  )
}
