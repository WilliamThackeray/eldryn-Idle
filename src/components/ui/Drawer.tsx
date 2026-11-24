import { useEffect, useRef, type ReactNode } from 'react'
import { cx } from './format'

interface DrawerProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Right-side panel. Escape and scrim click close it. */
export function Drawer({ open, title, onClose, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-ink/60"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          'relative z-10 flex h-full w-full max-w-md flex-col border-l border-line bg-brown shadow-xl outline-none',
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-page text-gold">{title}</h2>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-meta text-muted hover:bg-ink hover:text-parchment"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
