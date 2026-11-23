import type { ButtonHTMLAttributes } from 'react'
import { cx } from './format'
import { Tooltip } from './Tooltip'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-sage text-ink hover:bg-gold',
  secondary: 'bg-brown text-parchment hover:bg-crimson',
  ghost: 'bg-transparent text-parchment hover:bg-brown',
  danger: 'bg-crimson text-parchment hover:bg-brown',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  disabledReason?: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  disabledReason,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const button = (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors',
        size === 'sm' ? 'px-2.5 py-1 text-meta' : 'px-3 py-2 text-body',
        disabled ? 'cursor-not-allowed border border-line bg-ink text-muted' : VARIANT[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
  if (!disabled || !disabledReason) return button
  return (
    <Tooltip content={disabledReason} focusable className={className}>
      <span className={cx('inline-flex', className)}>{button}</span>
    </Tooltip>
  )
}
