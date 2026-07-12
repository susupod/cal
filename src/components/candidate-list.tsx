import type {
  CalendarAvailabilityRange,
  CalendarAvailabilitySlot,
} from "@/components/ui/full-calendar"
import { getCandidateSlots } from "@/lib/calendar-candidates"
import { ScheduleList } from "@/components/schedule-list"

type CandidateListProps = {
  ranges: CalendarAvailabilityRange[]
  selectedSlot: CalendarAvailabilitySlot | null
  today: Date
  onSelect: (slot: CalendarAvailabilitySlot) => void
}

export function CandidateList({
  ranges,
  selectedSlot,
  today,
  onSelect,
}: CandidateListProps) {
  const slotsByRangeId = new Map(
    getCandidateSlots(ranges).map((slot) => [slot.range!.id, slot])
  )
  const selectedRange = ranges.find(
    (range) =>
      selectedSlot != null &&
      selectedSlot.start >= range.start &&
      selectedSlot.end <= range.end
  )

  return (
    <ScheduleList
      items={ranges.map((range) => ({
        id: range.id,
        start: range.start,
        end: range.end,
      }))}
      selectedId={selectedRange?.id ?? null}
      today={today}
      onSelect={(id) => {
        const slot = slotsByRangeId.get(id)
        if (slot != null) onSelect(slot)
      }}
      ariaLabel="가능한 시간"
      emptyMessage="가능한 시간이 없어요"
    />
  )
}
