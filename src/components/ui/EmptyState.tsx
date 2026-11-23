import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  text,
  action,
}: {
  icon?: ReactNode
  text: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line px-4 py-8 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <p className="text-body text-muted">{text}</p>
      {action}
    </div>
  )
}
