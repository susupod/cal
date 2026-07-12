import { describe, expect, it } from "vitest"

import {
  getEventDisplayColor,
  getCurrentTimeLineStyle,
  getCurrentTimeTop,
  subtractBusyEventsFromRange,
  type CalendarAvailabilityRange,
  type CalendarEvent,
} from "./full-calendar"

const at = (hour: number) => new Date(2026, 6, 21, hour)

const availabilityRange: CalendarAvailabilityRange = {
  id: "jul-21",
  title: "가능 시간",
  start: at(11),
  end: at(15),
  availableCount: 6,
  totalCount: 6,
  durationMinutes: 60,
}

const busyEvent: CalendarEvent = {
  id: "lunch",
  title: "점심시간",
  start: at(12),
  end: at(13),
}

describe("getEventDisplayColor", () => {
  it("keeps source color in Calendar view and neutralizes it in scheduling view", () => {
    expect(getEventDisplayColor("purple", "source")).toBe("purple")
    expect(getEventDisplayColor("purple", "neutral")).toBe("grey")
  })
})

describe("getCurrentTimeLineStyle", () => {
  it("limits the current-time line to today’s weekday column", () => {
    expect(getCurrentTimeLineStyle(3)).toEqual({
      left: "calc(42.857142857142854% + 1.7142857142857142rem)",
      width: "calc((100% - 3rem) / 7)",
    })
  })
})

describe("getCurrentTimeTop", () => {
  it("uses the fixed calendar time for the current-time marker", () => {
    expect(getCurrentTimeTop(at(12))).toBe(960)
  })
})

describe("subtractBusyEventsFromRange", () => {
  it("keeps every duration-sized free segment on the same day", () => {
    const segments = subtractBusyEventsFromRange(availabilityRange, [busyEvent])

    expect(segments).toHaveLength(2)
    expect(
      segments.map((segment) => [
        segment.start.getHours(),
        segment.end.getHours(),
      ])
    ).toEqual([
      [11, 12],
      [13, 15],
    ])
  })
})
