import type { KeyboardEvent, ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { cx } from './format'
import { moveTab } from './tabKeys'

export interface TabItem {
  id: string
  label: string
  count?: number | string
  running?: boolean
  locked?: boolean
  lockLevel?: number
}

function domId(name: string, id: string): string {
  return `${name}-${id.replace(/[^A-Za-z0-9_-]+/g, '-')}`
}

interface TabsProps {
  name: string
  label: string
  tabs: TabItem[]
  value: string
  onChange: (id: string) => void
  variant?: 'underline' | 'pill'
}

export function Tabs({ name, label, tabs, value, onChange, variant = 'underline' }: TabsProps) {
  const selected = Math.max(0, tabs.findIndex((tab) => tab.id === value))

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = moveTab(selected, tabs.length, event.key)
    if (next == null) return
    event.preventDefault()
    const tab = tabs[next]
    if (!tab) return
    onChange(tab.id)
    document.getElementById(domId(name, `tab-${tab.id}`))?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx('flex flex-wrap gap-1', variant === 'underline' && 'border-b border-line')}
    >
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={domId(name, `tab-${tab.id}`)}
            aria-selected={active}
            aria-controls={domId(name, `panel-${tab.id}`)}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cx(
              'inline-flex items-center gap-1.5 text-body font-semibold',
              variant === 'underline'
                ? cx('-mb-px border-b-2 px-3 py-2', active ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-parchment')
                : cx('rounded-full px-3 py-1', active ? 'bg-crimson text-parchment' : 'bg-panel text-parchment hover:bg-brown'),
            )}
          >
            {tab.running && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sage" aria-hidden />}
            {tab.locked && <Lock size={12} aria-hidden />}
            {tab.label}
            {tab.locked && tab.lockLevel != null && <span className="text-meta">Lv {tab.lockLevel}</span>}
            {tab.count != null && (
              <span className="rounded bg-ink px-1.5 text-meta text-parchment">{tab.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({
  name,
  id,
  active,
  children,
}: {
  name: string
  id: string
  active: boolean
  children: ReactNode
}) {
  if (!active) return null
  return (
    <div role="tabpanel" id={domId(name, `panel-${id}`)} aria-labelledby={domId(name, `tab-${id}`)}>
      {children}
    </div>
  )
}
