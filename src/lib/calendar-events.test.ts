import { describe, expect, it } from "vitest"

import {
  clearTemporaryCalendarEvents,
  createCalendarEvent,
  updateCalendarEventTitle,
} from "./calendar-events"

const start = new Date(2026, 6, 8, 9, 30)
const end = new Date(2026, 6, 8, 10, 30)

describe("createCalendarEvent", () => {
  it("creates a persisted busy event from selected slot data", () => {
    expect(
      createCalendarEvent({
        id: "new-meeting",
        title: "디자인 방향성 리뷰",
        start,
        end,
      })
    ).toMatchObject({
      id: "new-meeting",
      title: "디자인 방향성 리뷰",
      start,
      end,
      color: "blue",
      kind: "busy",
    })
  })
})

describe("clearTemporaryCalendarEvents", () => {
  it("removes user-created temporary events and keeps seeded events", () => {
    const seedEvent = {
      ...createCalendarEvent({ id: "seed", title: "기존 일정", start, end }),
      isTemporary: false,
    }
    const temporaryEvent = createCalendarEvent({
      id: "temporary",
      title: "임시 일정",
      start,
      end,
    })

    expect(clearTemporaryCalendarEvents([seedEvent, temporaryEvent])).toEqual([
      seedEvent,
    ])
  })
})

describe("updateCalendarEventTitle", () => {
  it("updates only the selected event title", () => {
    const events = [
      createCalendarEvent({ id: "first", title: "첫 일정", start, end }),
      createCalendarEvent({ id: "second", title: "둘째 일정", start, end }),
    ]

    expect(updateCalendarEventTitle(events, "second", "바뀐 일정")).toEqual([
      events[0],
      { ...events[1], title: "바뀐 일정" },
    ])
  })
})
