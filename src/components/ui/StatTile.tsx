import type { ReactNode } from 'react'
import { Tooltip } from './Tooltip'

export function StatTile({
  label,
  value,
  breakdown,
}: {
  label: string
  value: ReactNode
  breakdown?: ReactNode
}) {
  const tile = (
    <div className="w-full rounded-lg border border-line bg-raised px-3 py-2">
      <div className="text-meta text-muted">{label}</div>
      <div className="text-card text-parchment">{value}</div>
    </div>
  )
  if (!breakdown) return tile
  return (
    <Tooltip content={breakdown} className="w-full">
      {tile}
    </Tooltip>
  )
}
