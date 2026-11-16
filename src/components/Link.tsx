import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface LinkProps {
  icon: ReactNode
  label: string
  onClick: () => void
  active: boolean
  /** Header icons sit on the right; tip below keeps the label on-screen. */
  tipSide?: 'right' | 'below'
}

export function Link({ icon, label, onClick, active, tipSide = 'right' }: LinkProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [tip, setTip] = useState<{ top: number; left: number; side: 'right' | 'below' } | null>(null)

  const showTip = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    setTip(
      tipSide === 'below'
        ? { top: rect.bottom + 8, left: rect.left + rect.width / 2, side: 'below' }
        : { top: rect.top + rect.height / 2, left: rect.right + 8, side: 'right' },
    )
  }

  const hideTip = () => setTip(null)

  const host = typeof document !== 'undefined' ? document.getElementById('tooltip-root') : null

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      onMouseEnter={showTip}
      onFocus={showTip}
      onMouseLeave={hideTip}
      onBlur={hideTip}
      aria-label={label}
      className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
        active ? 'bg-crimson text-parchment' : 'text-parchment hover:bg-brown'
      }`}
    >
      {icon}
      {tip &&
        host &&
        createPortal(
          <span
            role="tooltip"
            className={`absolute whitespace-nowrap rounded-md bg-panel px-2 py-1 text-xs text-parchment shadow-lg ring-1 ring-brown/60 ${
              tip.side === 'below' ? '-translate-x-1/2' : '-translate-y-1/2'
            }`}
            style={{ top: tip.top, left: tip.left }}
          >
            {label}
          </span>,
          host,
        )}
    </button>
  )
}
