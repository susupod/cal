import type { RefObject } from "react"

import { ScheduleList } from "@/components/schedule-list"
import type { CalendarEvent } from "@/components/ui/full-calendar"

type UpcomingEventListProps = {
  events: CalendarEvent[]
  selectedEventId: string | null
  today: Date
  onSelect: (event: CalendarEvent) => void
  scrollRootRef?: RefObject<HTMLElement | null>
}

export function UpcomingEventList({
  events,
  selectedEventId,
  today,
  onSelect,
  scrollRootRef,
}: UpcomingEventListProps) {
  const eventsById = new Map(events.map((event) => [event.id, event]))

  return (
    <ScheduleList
      items={events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
      }))}
      selectedId={selectedEventId}
      today={today}
      onSelect={(id) => {
        const event = eventsById.get(id)
        if (event != null) onSelect(event)
      }}
      ariaLabel="다가오는 일정"
      emptyMessage="일정이 없어요"
      scrollRootRef={scrollRootRef}
    />
  )
}
