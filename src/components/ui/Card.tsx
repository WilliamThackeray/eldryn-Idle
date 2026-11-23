import type { HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { cx } from './format'

type Variant = 'default' | 'interactive' | 'muted' | 'highlight'

const VARIANT: Record<Variant, string> = {
  default: 'border-line bg-panel',
  interactive: 'border-line bg-panel hover:border-gold',
  muted: 'border-line bg-ink text-muted',
  highlight: 'border-gold bg-panel ring-1 ring-gold',
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  selected?: boolean
  children: ReactNode
}

export function Card({ variant = 'default', selected = false, className, children, ...props }: CardProps) {
  const clickable = typeof props.onClick === 'function'
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    props.onKeyDown?.(event)
    if (!clickable || event.defaultPrevented) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    props.onClick?.(event as unknown as MouseEvent<HTMLDivElement>)
  }
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={clickable ? selected : undefined}
      className={cx(
        'rounded-lg border p-4 text-parchment',
        VARIANT[variant],
        variant === 'interactive' && 'cursor-pointer',
        selected && 'ring-2 ring-gold',
        className,
      )}
      {...props}
      onKeyDown={clickable ? onKeyDown : props.onKeyDown}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mb-2 flex items-start justify-between gap-2', className)}>{children}</div>
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('text-body', className)}>{children}</div>
}
