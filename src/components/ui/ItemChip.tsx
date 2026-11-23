import type { ReactNode } from 'react'
import { cx } from './format'

export function ItemChip({
  name,
  icon,
  owned,
  needed,
  note,
}: {
  name: string
  icon?: ReactNode
  owned?: number
  needed?: number
  note?: string
}) {
  const short = needed != null && (owned ?? 0) < needed
  const initial = name.trim().slice(0, 1).toUpperCase() || '?'
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-raised px-2 py-1 text-body text-parchment">
      <span className="flex h-5 w-5 items-center justify-center rounded bg-ink text-meta text-gold" aria-hidden>
        {icon ?? initial}
      </span>
      <span>{name}</span>
      {needed != null && (
        <span className={cx('text-meta font-semibold', short ? 'text-lack' : 'text-muted')}>
          {owned ?? 0}/{needed}
        </span>
      )}
      {note && <span className="text-meta text-muted">{note}</span>}
    </span>
  )
}
