import { useState, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { SubHeading } from '../../../components/ui/SectionHeading'
import { visibleActivities } from '../../../data/activities/display'
import type { ActivityDef } from '../../../data/activities'

export function ActivityGroup({
  title,
  activities,
  locked,
  hideLocked,
  children,
}: {
  title?: string
  activities: ActivityDef[]
  locked: (activity: ActivityDef) => boolean
  hideLocked: boolean
  children: (activity: ActivityDef) => ReactNode
}) {
  const [showAll, setShowAll] = useState(false)
  const marked = activities.map((activity) => ({ activity, locked: locked(activity) }))
  const { shown, hiddenLocked } = visibleActivities(marked, hideLocked, showAll)
  if (shown.length === 0 && hiddenLocked === 0) return null
  return (
    <section className="space-y-2">
      {title && <SubHeading title={title} />}
      <div className="grid grid-cols-1 gap-3 min-[1280px]:grid-cols-2">
        {shown.map((item) => (
          <div key={item.activity.id}>{children(item.activity)}</div>
        ))}
      </div>
      {hiddenLocked > 0 && (
        <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
          Show {hiddenLocked} more locked
        </Button>
      )}
    </section>
  )
}
