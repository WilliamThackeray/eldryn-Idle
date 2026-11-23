import type { ReactNode } from 'react'

export function SectionHeading({
  title,
  count,
  action,
}: {
  title: string
  count?: number
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-section text-gold">
        {title}
        {count != null && <span className="ml-2 text-meta font-semibold text-muted">{count}</span>}
      </h2>
      {action}
    </div>
  )
}

export function SubHeading({ title, count }: { title: string; count?: number }) {
  return (
    <h3 className="mb-2 text-card text-parchment">
      {title}
      {count != null && <span className="ml-2 text-meta font-normal text-muted">{count}</span>}
    </h3>
  )
}
