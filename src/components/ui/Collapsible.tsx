import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from './format'

export function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-line">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 py-2 text-left text-body text-parchment"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {title}
        <ChevronDown size={16} className={cx('shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && <div className="pb-2 text-body text-muted">{children}</div>}
    </div>
  )
}
