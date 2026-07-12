import { describe, expect, it } from "vitest"

import type { CalendarAvailabilityRange } from "@/components/ui/full-calendar"

import {
  getCandidateSlots,
  getRelativeDayLabel,
  groupCandidateSlotsByDate,
  getUpcomingCandidateRanges,
} from "./calendar-candidates"

const at = (day: number, time: string) => {
  const [hour, minute] = time.split(":").map(Number)
  return new Date(2026, 6, day, hour, minute)
}

const range = (id: string, day: number, start: string, end: string) =>
  ({
    id,
    title: "가능 시간",
    start: at(day, start),
    end: at(day, end),
    availableCount: 2,
    totalCount: 2,
    durationMinutes: 60,
  }) satisfies CalendarAvailabilityRange

describe("getCandidateSlots", () => {
  it("orders slots nearest-first and caps their end to the range", () => {
    const earlier = range("earlier", 9, "10:00", "10:45")
    const later = range("later", 15, "13:00", "15:00")

    const slots = getCandidateSlots([later, earlier])

    expect(slots.map((slot) => slot.range?.id)).toEqual(["earlier", "later"])
    expect(slots[0]?.end).toEqual(earlier.end)
  })
})

describe("groupCandidateSlotsByDate", () => {
  it("groups nearest-first slots by calendar date", () => {
    const first = getCandidateSlots([range("first", 9, "10:00", "11:00")])[0]!
    const second = getCandidateSlots([range("second", 9, "13:00", "14:00")])[0]!
    const third = getCandidateSlots([range("third", 10, "10:00", "11:00")])[0]!

    expect(groupCandidateSlotsByDate([third, second, first])).toEqual([
      { date: first.start, slots: [first, second] },
      { date: third.start, slots: [third] },
    ])
  })
})

describe("getUpcomingCandidateRanges", () => {
  it("excludes candidate ranges that start before the reference time", () => {
    const referenceTime = at(8, "12:00")
    const past = range("past", 8, "10:00", "12:00")
    const upcoming = range("upcoming", 8, "13:00", "14:00")

    expect(getUpcomingCandidateRanges([past, upcoming], referenceTime)).toEqual(
      [upcoming]
    )
  })
})

describe("getRelativeDayLabel", () => {
  it("describes candidate dates relative to today", () => {
    const today = at(8, "09:00")

    expect(getRelativeDayLabel(at(8, "14:00"), today)).toBe("오늘")
    expect(getRelativeDayLabel(at(11, "14:00"), today)).toBe("3일 뒤")
  })
})
