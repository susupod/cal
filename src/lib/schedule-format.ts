export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}분`
  if (minutes % 60 === 0) return `${minutes / 60}시간`

  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`
}
