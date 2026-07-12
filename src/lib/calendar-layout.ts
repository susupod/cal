export type CalendarLayoutEvent = {
  id: string
  start: Date
  end: Date
}

export type CalendarLayout = {
  event: CalendarLayoutEvent
  leftPercent?: number
  widthPercent?: number
  offsetPx: number
  zIndex: number
}

export type CalendarPreviewSlot = {
  start: Date
  end: Date
  recommended: boolean
  blocked: boolean
}

export const previewEventId = '__selection-preview__'

export const layoutOverlappingEvents = <TEvent extends CalendarLayoutEvent>(events: TEvent[]) => {
  const result: Array<CalendarLayout & { event: TEvent }> = []
  let group: TEvent[] = []
  let groupEnd = 0

  const flush = () => {
    if (group.length === 0) return

    result.push(...layoutOverlapGroup(group))
    group = []
    groupEnd = 0
  }

  for (const event of events) {
    if (group.length > 0 && event.start.getTime() >= groupEnd) {
      flush()
    }
    group.push(event)
    groupEnd = Math.max(groupEnd, event.end.getTime())
  }
  flush()

  return result
}

export const getPreviewLayoutFromSlot = <TEvent extends CalendarLayoutEvent>(
  events: TEvent[],
  slot: CalendarPreviewSlot
) => {
  const previewEvent = getPreviewEventFromSlot(slot)
  const overlappingEvents = events.filter(
    (event) => event.start < previewEvent.end && event.end > previewEvent.start
  )

  if (overlappingEvents.length === 0) return null

  if (overlappingEvents.length === 1) {
    return {
      event: previewEvent,
      offsetPx: 12,
      zIndex: 2,
    }
  }

  return {
    event: previewEvent,
    leftPercent: 50,
    widthPercent: 49,
    offsetPx: 0,
    zIndex: overlappingEvents.length + 1,
  }
}

const getPreviewEventFromSlot = (slot: CalendarPreviewSlot): CalendarLayoutEvent => ({
  id: previewEventId,
  start: slot.start,
  end: slot.end,
})

const layoutOverlapGroup = <TEvent extends CalendarLayoutEvent>(events: TEvent[]) => {
  const lineOffsetPx = 6
  const maxConcurrent = getMaxConcurrentEvents(events)

  if (maxConcurrent >= 3) {
    return layoutSplitOverlapGroup(events)
  }

  const sortedEvents = [...events].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime()
  )
  const lanes: Array<TEvent | null> = []

  return sortedEvents.map((event) => {
    for (let index = 0; index < lanes.length; index += 1) {
      const laneEvent = lanes[index]
      if (laneEvent != null && laneEvent.end <= event.start) {
        lanes[index] = null
      }
    }

    const reusableLane = lanes.findIndex((laneEvent) => laneEvent == null)
    const lane = reusableLane === -1 ? lanes.length : reusableLane
    lanes[lane] = event

    return {
      event,
      offsetPx: lane * lineOffsetPx,
      zIndex: lane + 1,
    }
  })
}

const layoutSplitOverlapGroup = <TEvent extends CalendarLayoutEvent>(events: TEvent[]) => {
  const gapPercent = 1
  const sortedEvents = [...events].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime()
  )
  const lanes: Array<TEvent | null> = []
  const eventLanes = new Map<TEvent, number>()

  for (const event of sortedEvents) {
    for (let index = 0; index < lanes.length; index += 1) {
      const laneEvent = lanes[index]
      if (laneEvent != null && laneEvent.end <= event.start) {
        lanes[index] = null
      }
    }

    const reusableLane = lanes.findIndex((laneEvent) => laneEvent == null)
    const lane = reusableLane === -1 ? lanes.length : reusableLane
    lanes[lane] = event
    eventLanes.set(event, lane)
  }

  const laneCount = Math.max(lanes.length, 1)
  const widthPercent = 100 / laneCount

  return sortedEvents.map((event) => {
    const lane = eventLanes.get(event) ?? 0

    return {
      event,
      leftPercent: lane * widthPercent,
      widthPercent: widthPercent - gapPercent,
      offsetPx: 0,
      zIndex: lane + 1,
    }
  })
}

const getMaxConcurrentEvents = <TEvent extends CalendarLayoutEvent>(events: TEvent[]) => {
  const points = events.flatMap((event) => [
    { time: event.start.getTime(), delta: 1 },
    { time: event.end.getTime(), delta: -1 },
  ])
  points.sort((a, b) => a.time - b.time || a.delta - b.delta)

  let active = 0
  let max = 0
  for (const point of points) {
    active += point.delta
    max = Math.max(max, active)
  }

  return max
}
