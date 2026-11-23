import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './format'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'below' | 'right'
  /** Let keyboard users reach a reason wrapped around a disabled control. */
  focusable?: boolean
  className?: string
}

export function Tooltip({ content, children, side = 'below', focusable = false, className }: TooltipProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; align: 'center' | 'start' } | null>(null)
  const host = typeof document !== 'undefined' ? document.getElementById('tooltip-root') : null

  const show = () => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    if (side === 'right') {
      const headerBottom = document.getElementById('app-header')?.getBoundingClientRect().bottom ?? 0
      const centered = rect.top + rect.height / 2
      // Sidebar tips used to land on the page title. Drop them under the header.
      if (centered < headerBottom + 14) {
        setPos({ top: headerBottom + 8, left: rect.right + 8, align: 'start' })
      } else {
        setPos({ top: centered, left: rect.right + 8, align: 'center' })
      }
      return
    }
    setPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2, align: 'center' })
  }

  return (
    <span
      ref={ref}
      className={cx('inline-flex', className)}
      tabIndex={focusable ? 0 : undefined}
      aria-label={focusable && typeof content === 'string' ? content : undefined}
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
      onFocus={show}
      onBlur={() => setPos(null)}
    >
      {children}
      {pos &&
        host &&
        createPortal(
          <span
            role="tooltip"
            className={cx(
              'pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-line bg-raised px-2 py-1 text-meta text-parchment shadow-lg',
              pos.align === 'center' && (side === 'below' ? '-translate-x-1/2' : '-translate-y-1/2'),
            )}
            style={{ top: pos.top, left: pos.left }}
          >
            {content}
          </span>,
          host,
        )}
    </span>
  )
}
