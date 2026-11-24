import type { ReactNode } from 'react'
import { SubHeading } from '../../../components/ui/SectionHeading'
import { visibleActivities } from '../../../data/activities/display'
import type { ActivityDef } from '../../../data/activities'

export function ActivityGroup({
  title,
  activities,
  locked,
  hideLocked,
  preview = true,
  children,
}: {
  title?: string
  activities: ActivityDef[]
  locked: (activity: ActivityDef) => boolean
  hideLocked: boolean
  preview?: boolean
  children: (activity: ActivityDef) => ReactNode
}) {
  const marked = activities.map((activity) => ({
    activity,
    locked: locked(activity),
    level: activity.requiredLevel,
  }))
  const shown = preview ? visibleActivities(marked, hideLocked).shown : marked
  const moreMax = preview ? visibleActivities(marked, hideLocked).moreMax : null
  if (shown.length === 0 && moreMax == null) return null
  return (
    <section className="space-y-2">
      {title && <SubHeading title={title} />}
      <div className="grid grid-cols-1 gap-3 min-[1280px]:grid-cols-2">
        {shown.map((item) => (
          <div key={item.activity.id}>{children(item.activity)}</div>
        ))}
      </div>
      {moreMax != null && <p className="text-meta text-muted">More unlocks up to level {moreMax}</p>}
    </section>
  )
}
