/** Next tab index for ArrowLeft/Right (wraps), Home, and End. Null if the key is not a tab key. */
export function moveTab(index: number, count: number, key: string): number | null {
  if (count <= 0) return null
  if (key === 'ArrowRight') return (index + 1) % count
  if (key === 'ArrowLeft') return (index - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}
