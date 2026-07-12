import { addMinutes, differenceInCalendarDays } from "date-fns"

import type {
  CalendarAvailabilityRange,
  CalendarAvailabilitySlot,
} from "@/components/ui/full-calendar"

export const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"]

export function getCandidateSlots(
  ranges: CalendarAvailabilityRange[]
): CalendarAvailabilitySlot[] {
  return [...ranges]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((range) => {
      const durationEnd = addMinutes(range.start, range.durationMinutes ?? 60)

      return {
        range,
        start: range.start,
        end: durationEnd < range.end ? durationEnd : range.end,
        blocked: false,
        recommended: true,
      }
    })
}

export function groupCandidateSlotsByDate(
  slots: CalendarAvailabilitySlot[]
): Array<{ date: Date; slots: CalendarAvailabilitySlot[] }> {
  return [...slots]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .reduce<Array<{ date: Date; slots: CalendarAvailabilitySlot[] }>>(
      (groups, slot) => {
        const group = groups.at(-1)

        if (group?.date.toDateString() === slot.start.toDateString()) {
          group.slots.push(slot)
        } else {
          groups.push({ date: slot.start, slots: [slot] })
        }

        return groups
      },
      []
    )
}

export function getUpcomingCandidateRanges(
  ranges: CalendarAvailabilityRange[],
  referenceTime: Date
) {
  return ranges.filter((range) => range.start >= referenceTime)
}

export function formatCandidateDateLabel(date: Date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdayLabels[date.getDay()]}`
}

export function formatTime(date: Date) {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
}

export function getRelativeDayLabel(date: Date, today: Date) {
  const days = differenceInCalendarDays(date, today)

  if (days === 0) return "오늘"
  if (days > 0) return `${days}일 뒤`
  return `${Math.abs(days)}일 전`
}
