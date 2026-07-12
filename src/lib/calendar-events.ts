import type { CalendarEvent } from "@/components/ui/full-calendar"

type NewCalendarEvent = Pick<CalendarEvent, "id" | "title" | "start" | "end">

export const createCalendarEvent = ({
  id,
  title,
  start,
  end,
}: NewCalendarEvent): CalendarEvent => ({
  id,
  title,
  start,
  end,
  color: "blue",
  kind: "busy",
  isTemporary: true,
})

export const clearTemporaryCalendarEvents = (
  events: CalendarEvent[]
): CalendarEvent[] => events.filter((event) => !event.isTemporary)

export const updateCalendarEventTitle = (
  events: CalendarEvent[],
  id: string,
  title: string
): CalendarEvent[] =>
  events.map((event) => (event.id === id ? { ...event, title } : event))
