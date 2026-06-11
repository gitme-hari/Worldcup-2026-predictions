import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string }>(
  ({ className, label, id, ...props }, ref) => (
    <div className="space-y-1">
      {label && <label htmlFor={id} className="text-xs font-medium text-zinc-600">{label}</label>}
      <input
        ref={ref}
        id={id}
        className={cn(
          'w-full rounded border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
          className
        )}
        {...props}
      />
    </div>
  )
)

Input.displayName = 'Input'
