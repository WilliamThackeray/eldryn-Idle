import { useRef } from 'react'

interface ProgressBarProps {
  progress: number
  className?: string
  barClassName?: string
  label?: string
}

/** Paints width with a 100ms linear ease between game ticks; snaps when progress resets. */
export function ProgressBar({
  progress,
  className = 'h-2',
  barClassName = 'bg-gold',
  label,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress))
  const previous = useRef(clamped)
  const snap = clamped < previous.current
  previous.current = clamped

  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-brown ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
    >
      <div
        className={`h-full ${barClassName}`}
        style={{
          width: `${clamped}%`,
          transition: snap ? 'none' : 'width 100ms linear',
        }}
      />
    </div>
  )
}
