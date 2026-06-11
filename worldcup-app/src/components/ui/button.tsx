import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'primary'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed',
          size === 'sm' && 'px-2.5 py-1 text-xs',
          size === 'md' && 'px-3 py-1.5 text-sm',
          size === 'lg' && 'px-4 py-2 text-base',
          variant === 'default' && 'bg-zinc-900 text-white hover:bg-zinc-700',
          variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
          variant === 'outline' && 'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50',
          variant === 'ghost' && 'text-zinc-600 hover:bg-zinc-100',
          variant === 'destructive' && 'bg-red-600 text-white hover:bg-red-700',
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
