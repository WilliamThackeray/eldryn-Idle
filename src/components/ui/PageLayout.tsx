import type { ReactNode } from 'react'
import { cx } from './format'

export function SidePanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <aside
      className={cx(
        // shortcut: 8rem clears a two-line header; raise it if the header grows past that
        'sticky top-0 max-h-[calc(100dvh-8rem)] self-start overflow-y-auto',
        className,
      )}
    >
      {children}
    </aside>
  )
}

export function PageLayout({ children, side }: { children: ReactNode; side?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] p-6">
      {side == null ? (
        children
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
          <div className="min-w-0">{children}</div>
          <SidePanel>{side}</SidePanel>
        </div>
      )}
    </div>
  )
}
