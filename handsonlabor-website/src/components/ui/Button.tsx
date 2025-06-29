import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth = false, ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          
          // Variants
          {
            'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500': variant === 'primary',
            'bg-white hover:bg-gray-50 text-primary-600 border border-primary-600 focus:ring-primary-500': variant === 'secondary',
            'bg-accent-500 hover:bg-accent-600 text-white focus:ring-accent-400': variant === 'accent',
            'border border-secondary-300 bg-white hover:bg-secondary-50 text-secondary-700 focus:ring-secondary-500': variant === 'outline',
            'hover:bg-secondary-100 text-secondary-700 focus:ring-secondary-500': variant === 'ghost',
          },
          
          // Sizes
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
            'px-8 py-4 text-lg': size === 'xl',
          },
          
          // Full width
          fullWidth && 'w-full',
          
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
